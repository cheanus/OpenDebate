from neomodel import config
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi import Depends
from config_private import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, psql_config
from schemas.db.psql import DbBase, User
from collections.abc import AsyncGenerator

psql_sessioner = None
psql_async_sessioner = None


def init_db():
    # Configure Neomodel
    config.DATABASE_URL = (
        f"bolt://{NEO4J_USER}:{NEO4J_PASSWORD}@{NEO4J_URI}"
    )

    # Initialize PostgreSQL synchronous sessioner
    global psql_sessioner
    engine = create_engine(
        f'postgresql://{psql_config["user"]}:{psql_config["password"]}@{psql_config["host"]}:{psql_config["port"]}/{psql_config["dbname"]}'
    )
    DbBase.metadata.create_all(engine)
    psql_session_factory = sessionmaker(bind=engine)
    psql_sessioner = scoped_session(psql_session_factory)

    # Initialize async sessioner for authentication
    global psql_async_sessioner
    async_engine = create_async_engine(
        f'postgresql+asyncpg://{psql_config["user"]}:{psql_config["password"]}@{psql_config["host"]}:{psql_config["port"]}/{psql_config["dbname"]}',
    )
    # Use async_sessionmaker for AsyncEngine
    psql_async_sessioner = async_sessionmaker(
        bind=async_engine,
        expire_on_commit=False,
    )


def close_db():
    global psql_sessioner
    if psql_sessioner:
        psql_sessioner.remove()
        psql_sessioner = None


@contextmanager
def get_psql_session():
    """
    Provides a thread-safe session for database operations.
    Use this function within a context manager to ensure proper cleanup.
    """
    global psql_sessioner
    if not psql_sessioner:
        raise RuntimeError("PostgreSQL session not initialized")
    session = psql_sessioner()
    try:
        yield session
    finally:
        session.close()


async def get_async_psql_session() -> AsyncGenerator[AsyncSession, None]:
    global psql_async_sessioner
    if not psql_async_sessioner:
        raise RuntimeError("PostgreSQL async session not initialized")
    async with psql_async_sessioner() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_psql_session)):
    yield SQLAlchemyUserDatabase(session, User)
