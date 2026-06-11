"""Authentication router."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.password_reset import ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.user import (
    PasswordChange,
    TokenRefresh,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
)
from app.services.auth_service import AuthService
from app.services.password_reset_service import PasswordResetService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user account and return tokens (auto-login)."""
    service = AuthService(db)
    tokens = await service.register_with_tokens(user_data)
    return tokens


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get tokens",
)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return access and refresh tokens."""
    service = AuthService(db)
    tokens = await service.login(login_data)
    return tokens


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
async def refresh_token(token_data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    """Get a new access token using a refresh token."""
    service = AuthService(db)
    tokens = await service.refresh_token(token_data)
    return tokens


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
)
async def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the currently authenticated user's profile."""
    service = AuthService(db)
    updated_user = await service.update_profile(current_user, update_data)
    return updated_user


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change password",
)
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the current user's password."""
    service = AuthService(db)
    await service.change_password(current_user, password_data)
    return {"message": "Password changed successfully"}


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Request password reset",
)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset token. Returns success even if email doesn't exist (security)."""
    service = PasswordResetService(db)
    token = await service.create_reset_token(data.email)
    # In production, send this token via email
    response = {"message": "If the email exists, a reset link has been sent."}
    if token:
        # Include token in response for development/testing purposes
        response["reset_token"] = token
    return response


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password with token",
)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token."""
    service = PasswordResetService(db)
    await service.reset_password(data.token, data.new_password)
    return {"message": "Password has been reset successfully"}


# ─── OAuth Endpoints ───────────────────────────────────────────────────────────

import logging
from urllib.parse import urlencode
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger(__name__)


class OAuthTokenRequest(BaseModel):
    """OAuth token exchange request."""
    code: str
    redirect_uri: str


@router.get("/google/url", summary="Get Google OAuth URL")
async def google_oauth_url():
    """Return the Google OAuth authorization URL."""
    if not settings.GOOGLE_CLIENT_ID:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Google OAuth not configured")

    redirect_uri = f"{settings.BACKEND_URL}/api/auth/google/callback"
    query_params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(query_params)}"
    return {"url": url}


@router.get("/google/callback", summary="Google OAuth callback")
async def google_oauth_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback — exchange code for tokens and create/login user."""
    import httpx

    redirect_uri = f"{settings.BACKEND_URL}/api/auth/google/callback"
    frontend_url = settings.FRONTEND_URL

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_response.status_code != 200:
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed", status_code=302)

    tokens = token_response.json()
    access_token = tokens.get("access_token")

    # Get user info
    async with httpx.AsyncClient() as client:
        user_info_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if user_info_response.status_code != 200:
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed", status_code=302)

    user_info = user_info_response.json()
    email = user_info.get("email")
    if not email:
        return RedirectResponse(url=f"{frontend_url}/login?error=no_email", status_code=302)

    name = user_info.get("name") or email.split("@")[0]

    # Find or create user
    from sqlalchemy import select
    from app.models.user import UserRole
    from app.core.security import hash_password, create_access_token, create_refresh_token
    import uuid

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        # Create new user
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=hash_password(uuid.uuid4().hex),  # Random password for OAuth users
            full_name=name,
            role=UserRole.CUSTOMER,
            is_active=True,
            avatar_url=user_info.get("picture"),
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    # Generate tokens
    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    await db.commit()

    # Redirect to frontend with tokens
    if user.role == UserRole.PROVIDER:
        dashboard = "/provider/dashboard"
    elif user.role == UserRole.ADMIN:
        dashboard = "/admin/dashboard"
    else:
        dashboard = "/dashboard"

    redirect_url = (
        f"{frontend_url}{dashboard}"
        f"?access_token={access_token}&refresh_token={refresh_token}"
    )
    return RedirectResponse(url=redirect_url, status_code=302)


@router.get("/microsoft/url", summary="Get Microsoft OAuth URL")
async def microsoft_oauth_url():
    """Return the Microsoft OAuth authorization URL."""
    if not settings.MICROSOFT_CLIENT_ID:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Microsoft OAuth not configured")

    client_id = settings.MICROSOFT_CLIENT_ID
    redirect_uri = f"{settings.BACKEND_URL}/api/auth/microsoft/callback"
    query_params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile User.Read",
    }
    url = (
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
        f"?{urlencode(query_params)}"
    )
    return {"url": url}


@router.get("/microsoft/callback", summary="Microsoft OAuth callback")
async def microsoft_oauth_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle Microsoft OAuth callback."""
    import httpx

    client_id = settings.MICROSOFT_CLIENT_ID
    client_secret = settings.MICROSOFT_CLIENT_SECRET
    redirect_uri = f"{settings.BACKEND_URL}/api/auth/microsoft/callback"
    frontend_url = settings.FRONTEND_URL

    if not client_secret:
        return RedirectResponse(url=f"{frontend_url}/login?error=microsoft_not_configured", status_code=302)

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_response.status_code != 200:
        logger.error(f"Microsoft token exchange failed: {token_response.status_code} - {token_response.text}")
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed", status_code=302)

    tokens = token_response.json()
    access_token = tokens.get("access_token")

    # Get user info from Microsoft Graph
    async with httpx.AsyncClient() as client:
        user_info_response = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if user_info_response.status_code != 200:
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed", status_code=302)

    user_info = user_info_response.json()
    email = user_info.get("mail") or user_info.get("userPrincipalName")
    name = user_info.get("displayName", email.split("@")[0] if email else "User")

    if not email:
        return RedirectResponse(url=f"{frontend_url}/login?error=no_email", status_code=302)

    # Find or create user
    from sqlalchemy import select
    from app.models.user import UserRole
    from app.core.security import hash_password, create_access_token, create_refresh_token
    import uuid

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=hash_password(uuid.uuid4().hex),
            full_name=name,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    # Generate tokens
    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    await db.commit()

    if user.role == UserRole.PROVIDER:
        dashboard = "/provider/dashboard"
    elif user.role == UserRole.ADMIN:
        dashboard = "/admin/dashboard"
    else:
        dashboard = "/dashboard"

    redirect_url = (
        f"{frontend_url}{dashboard}"
        f"?access_token={access_token}&refresh_token={refresh_token}"
    )
    return RedirectResponse(url=redirect_url, status_code=302)
