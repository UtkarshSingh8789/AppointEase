"""Audit log service."""

import math
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditService:
    """Service handling audit log operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_action(
        self,
        user_id: Optional[UUID],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """Log an action to the audit trail."""
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log

    async def get_audit_logs(
        self,
        page: int = 1,
        size: int = 50,
        user_id: Optional[UUID] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
    ) -> dict:
        """Get paginated audit logs with optional filters."""
        query = select(AuditLog)
        count_query = select(func.count(AuditLog.id))

        if user_id:
            query = query.where(AuditLog.user_id == user_id)
            count_query = count_query.where(AuditLog.user_id == user_id)

        if action:
            query = query.where(AuditLog.action == action)
            count_query = count_query.where(AuditLog.action == action)

        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
            count_query = count_query.where(AuditLog.resource_type == resource_type)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        offset = (page - 1) * size
        query = query.offset(offset).limit(size).order_by(AuditLog.created_at.desc())

        result = await self.db.execute(query)
        logs = result.scalars().all()

        return {
            "logs": logs,
            "total": total,
            "page": page,
            "per_page": size,
            "total_pages": math.ceil(total / size) if total > 0 else 0,
        }
