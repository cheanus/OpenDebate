from core.db_life import get_psql_session
from schemas.db.neo4j import Opinion as OpinionNeo4j
from schemas.db.psql import Opinion as OpinionPsql
from schemas.db.psql import Debate as DebatePsql


def clear_db():
    """清空数据库"""
    # 清空 Neo4j 数据库
    for opinion in OpinionNeo4j.nodes.all():
        opinion.delete()
    # 清空 PostgreSQL 数据库，包括debate和opinion表
    with get_psql_session() as session:
        session.query(OpinionPsql).delete()
        session.query(DebatePsql).delete()
        session.commit()
