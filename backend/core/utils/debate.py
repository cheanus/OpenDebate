from core.db_life import get_psql_session
from schemas.db.psql import Debate


def init_global_debate() -> str:
    """
    Initialize the special 'global' debate if it doesn't exist.
    """
    with get_psql_session() as session:
        # 查询是否已有 is_all=True 的全局 debate
        debate = session.query(Debate).filter(Debate.is_all == True).first()
        if not debate:
            debate = Debate(
                title="ALL",
                creator="system",
                description="This is a special debate that includes all opinions.",
                is_all=True,
            )
            try:
                session.add(debate)
                session.commit()
                session.refresh(debate)
            except Exception as e:
                session.rollback()
                raise RuntimeError(f"Failed to create global debate: {str(e)}")
        return str(debate.id)
