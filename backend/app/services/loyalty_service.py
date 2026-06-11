"""Loyalty service with business logic."""

import math
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction


class LoyaltyService:
    """Service handling loyalty operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_account(self, user_id: UUID) -> LoyaltyAccount:
        """Get or create a loyalty account for a user."""
        result = await self.db.execute(
            select(LoyaltyAccount).where(LoyaltyAccount.user_id == user_id)
        )
        account = result.scalar_one_or_none()

        if not account:
            account = LoyaltyAccount(user_id=user_id, points=0, tier="bronze")
            self.db.add(account)
            await self.db.flush()
            await self.db.refresh(account)

        return account

    async def get_transactions(
        self, user_id: UUID, page: int = 1, per_page: int = 20
    ) -> dict:
        """Get paginated loyalty transactions for a user."""
        account = await self.get_or_create_account(user_id)

        count_result = await self.db.execute(
            select(func.count(LoyaltyTransaction.id)).where(
                LoyaltyTransaction.account_id == account.id
            )
        )
        total = count_result.scalar()

        offset = (page - 1) * per_page
        result = await self.db.execute(
            select(LoyaltyTransaction)
            .where(LoyaltyTransaction.account_id == account.id)
            .order_by(LoyaltyTransaction.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        transactions = result.scalars().all()

        return {
            "transactions": transactions,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total > 0 else 0,
        }

    async def award_points(
        self, user_id: UUID, points: int, description: str
    ) -> LoyaltyAccount:
        """Award loyalty points to a user."""
        account = await self.get_or_create_account(user_id)

        transaction = LoyaltyTransaction(
            account_id=account.id,
            points=points,
            type="earned",
            description=description,
        )
        self.db.add(transaction)

        account.points += points
        # Update tier based on total points
        account.tier = self._calculate_tier(account.points)

        await self.db.flush()
        await self.db.refresh(account)
        return account

    async def redeem_points(self, user_id: UUID, points: int) -> LoyaltyAccount:
        """Redeem loyalty points."""
        account = await self.get_or_create_account(user_id)

        if account.points < points:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient points. Available: {account.points}",
            )

        transaction = LoyaltyTransaction(
            account_id=account.id,
            points=-points,
            type="redeemed",
            description=f"Redeemed {points} points",
        )
        self.db.add(transaction)

        account.points -= points
        account.tier = self._calculate_tier(account.points)

        await self.db.flush()
        await self.db.refresh(account)
        return account

    async def credit_refund(
        self, user_id: UUID, amount: int, description: str
    ) -> LoyaltyAccount:
        """Credit a refund back into the customer's wallet."""
        if amount <= 0:
            return await self.get_or_create_account(user_id)

        account = await self.get_or_create_account(user_id)

        transaction = LoyaltyTransaction(
            account_id=account.id,
            points=amount,
            type="refunded",
            description=description,
        )
        self.db.add(transaction)

        account.points += amount
        account.tier = self._calculate_tier(account.points)

        await self.db.flush()
        await self.db.refresh(account)
        return account

    def _calculate_tier(self, points: int) -> str:
        """Calculate loyalty tier based on total points."""
        if points >= 1000:
            return "gold"
        elif points >= 500:
            return "silver"
        return "bronze"
