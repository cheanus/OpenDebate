from neomodel import config
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, psql_config
from schemas.db.psql import DbBase

psql_sessioner = None


def init_db():
    global psql_sessioner
    # Configure Neomodel
    config.DATABASE_URL = (
        f"bolt://{NEO4J_USER}:{NEO4J_PASSWORD}@{NEO4J_URI.split('//')[1]}"
    )

    # Initialize PostgreSQL
    engine = create_engine(
        f'postgresql://{psql_config["user"]}:{psql_config["password"]}@{psql_config["host"]}:{psql_config["port"]}/{psql_config["dbname"]}'
    )
    DbBase.metadata.create_all(engine)
    psql_session_factory = sessionmaker(bind=engine)
    psql_sessioner = scoped_session(psql_session_factory)


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
