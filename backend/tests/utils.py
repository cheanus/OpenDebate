from neomodel import db
from core.db_life import get_psql_session
from schemas.db.psql import Opinion as OpinionPsql
from schemas.db.psql import Debate as DebatePsql


def clear_db():
    """清空数据库"""
    # 清空 Neo4j 数据库
    db.cypher_query("MATCH (n) DETACH DELETE n")
    # 清空 PostgreSQL 数据库，包括debate和opinion表
    with get_psql_session() as session:
        session.query(OpinionPsql).delete()
        session.query(DebatePsql).delete()
        session.commit()
