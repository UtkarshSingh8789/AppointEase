"""FastAPI bridge for showing MCP tool results inside the live app."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.models.user import User, UserRole
from app.mcp_server import (
    get_admin_dashboard,
    get_provider_availability,
    get_provider_dashboard,
    get_provider_details,
    get_current_user_context,
    health_check,
    list_categories,
    manifest_for_role,
    search_project_knowledge,
    search_providers,
    tools_for_role,
    admin_search_user,
    admin_get_user_detail,
)
from fastapi import HTTPException

router = APIRouter(prefix="/api/mcp-tools", tags=["MCP Tools"])


@router.get("/status")
async def mcp_status(current_user: User = Depends(get_current_user)):
    """Return MCP bridge status for the logged-in app UI."""
    health = await health_check()
    tool_names = tools_for_role(current_user.role.value)
    return {
        "connected": health.get("status") == "ok",
        "bridge": "FastAPI -> MCP tools -> PostgreSQL",
        "current_user": {
            "id": str(current_user.id),
            "name": current_user.full_name,
            "role": current_user.role.value,
        },
        "health": health,
        "tools": tool_names,
        "tool_count": len(tool_names),
    }


@router.get("/manifest")
async def mcp_manifest(current_user: User = Depends(get_current_user)):
    """Return a discoverable manifest of tools visible to the current user."""
    return manifest_for_role(current_user.role.value)


@router.get("/insights")
async def mcp_insights(current_user: User = Depends(get_current_user)):
    """Return a concise, role-aware MCP summary for dashboards and copilots."""
    role = current_user.role.value
    manifest = manifest_for_role(role)
    health = await health_check()
    payload = {
        "connected": health.get("status") == "ok",
        "manifest": manifest,
        "health": health,
        "highlights": [],
    }

    if role == "customer":
        payload["highlights"] = [
            "Search providers by service and location from live data.",
            "Inspect provider availability before opening the booking flow.",
            "Ask the chat assistant for MCP-backed booking help.",
        ]
    elif role == "provider":
        payload["highlights"] = [
            "Use live data to review your schedule and customer context.",
            "Check platform knowledge and your own booking activity faster.",
            "Prepare for appointments with the same data the assistant sees.",
        ]
    else:
        payload["highlights"] = [
            "Review platform totals, revenue, and appointment status counts.",
            "Trace MCP availability and the tools exposed to your role.",
            "Use the bridge as a read-only analytics and support surface.",
        ]

    return payload


@router.get("/context")
async def mcp_context(current_user: User = Depends(get_current_user)):
    """Return the signed-in user's live, role-aware appointment context."""
    return await get_current_user_context(email=current_user.email)


@router.get("/admin/users/search")
async def mcp_admin_search_user(
    q: str,
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
):
    """Search any user or provider by name or email (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access only")
    return await admin_search_user(query=q, limit=limit)


@router.get("/admin/users/detail")
async def mcp_admin_get_user_detail(
    identifier: str,
    current_user: User = Depends(get_current_user),
):
    """Get deep detail for one user or provider by name or email (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access only")
    return await admin_get_user_detail(identifier=identifier)


@router.get("/provider-dashboard")
async def mcp_provider_dashboard(
    current_user: User = Depends(get_current_user),
):
    """Return full provider dashboard via MCP (provider role only)."""
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(status_code=403, detail="Provider access only")
    return await get_provider_dashboard(email=current_user.email)


@router.get("/admin-dashboard")
async def mcp_admin_dashboard(
    current_user: User = Depends(get_current_user),
):
    """Return advanced admin dashboard via MCP (admin role only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access only")
    return await get_admin_dashboard()


@router.get("/categories")
async def mcp_categories(
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """List categories through the MCP tool bridge."""
    return await list_categories(limit=limit)


@router.get("/providers")
async def mcp_provider_search(
    query: str = "",
    category: str = "",
    location: str = "",
    verified_only: bool = True,
    limit: int = Query(5, ge=1, le=25),
    current_user: User = Depends(get_current_user),
):
    """Search providers through the MCP tool bridge."""
    return await search_providers(
        query=query,
        category=category,
        location=location,
        verified_only=verified_only,
        limit=limit,
    )


@router.get("/providers/{provider_id}")
async def mcp_provider_details(
    provider_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get one provider profile through the MCP tool bridge."""
    return await get_provider_details(provider_id=provider_id)


@router.get("/providers/{provider_id}/availability")
async def mcp_provider_slots(
    provider_id: str,
    date: str,
    timezone: str = "Asia/Kolkata",
    current_user: User = Depends(get_current_user),
):
    """Get provider slots through the MCP tool bridge."""
    return await get_provider_availability(
        provider_id=provider_id,
        target_date=date,
        timezone=timezone,
    )


@router.get("/knowledge")
async def mcp_knowledge_search(
    query: str,
    limit: int = Query(4, ge=1, le=10),
    current_user: User = Depends(get_current_user),
):
    """Search project knowledge through the MCP tool bridge."""
    return await search_project_knowledge(query=query, limit=limit)
