import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL es obligatoria y debe apuntar a PostgreSQL")
if not DATABASE_URL.startswith("postgresql+psycopg://"):
    raise RuntimeError("DATABASE_URL debe usar PostgreSQL con postgresql+psycopg://")


class Base(DeclarativeBase):
    pass


engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    database = SessionLocal()
    try:
        yield database
    finally:
        database.close()


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    create_admin()


def create_admin() -> None:
    from app.auth.models import User
    from app.auth.security import hash_password
    from sqlalchemy import select

    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        return
    with SessionLocal() as database:
        if database.scalar(select(User).where(User.email == admin_email.lower())):
            return
        database.add(
            User(
                name=os.getenv("ADMIN_NAME", "Administrador del sistema"),
                email=admin_email.lower(),
                password_hash=hash_password(admin_password),
                role="admin",
            )
        )
        database.commit()
