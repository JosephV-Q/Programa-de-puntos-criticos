from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.auth.models import User
from app.auth.security import create_access_token, hash_password, verify_password
from app.schemas import TokenResponse, UserCreate, UserLogin, UserResponse, UserRoleUpdate


router = APIRouter(prefix="/api/auth", tags=["autenticacion"])


def to_response(user: User) -> UserResponse:
    return UserResponse.model_validate(user)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(request: UserCreate, database: Session = Depends(get_db)) -> UserResponse:
    existing = database.scalar(select(User).where(User.email == request.email.lower()))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")
    user = User(
        name=request.name.strip(),
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        role="structural_engineer",
    )
    database.add(user)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado") from error
    database.refresh(user)
    return to_response(user)


@router.post("/login", response_model=TokenResponse)
def login_user(request: UserLogin, database: Session = Depends(get_db)) -> TokenResponse:
    user = database.scalar(select(User).where(User.email == request.email.lower()))
    if user is None or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos")
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        token_type="bearer",
        user=to_response(user),
    )


@router.get("/me", response_model=UserResponse)
def current_user(user: User = Depends(get_current_user)) -> UserResponse:
    return to_response(user)


@router.get("/users", response_model=list[UserResponse])
def list_users(
    database: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> list[UserResponse]:
    return [to_response(user) for user in database.scalars(select(User).order_by(User.created_at)).all()]


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: str,
    request: UserRoleUpdate,
    database: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> UserResponse:
    user = database.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    user.role = request.role
    database.commit()
    database.refresh(user)
    return to_response(user)
