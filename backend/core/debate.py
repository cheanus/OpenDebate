import datetime
from core.db_life import get_psql_session
from schemas.db.psql import Debate, Opinion, model2dict

_global_debate_cache: str | None = None


def create_debate(title: str, creator: str, description: str | None = None) -> str:
    """
    Create a new debate.
    """
    try:
        with get_psql_session() as psql_session:
            new_debate = Debate(title=title, creator=creator, description=description)
            psql_session.add(new_debate)
            psql_session.commit()
            psql_session.refresh(new_debate)
        return str(new_debate.id)
    except Exception as e:
        psql_session.rollback()
        raise RuntimeError(f"Failed to create debate: {str(e)}")


def delete_debate(debate_id: str):
    """
    Delete a debate by its ID.
    """
    # Cant delete the global debate
    if debate_id == get_global_debate():
        raise ValueError("Cannot delete the global debate.")

    with get_psql_session() as psql_session:
        debate_to_delete = (
            psql_session.query(Debate).filter(Debate.id == debate_id).first()
        )
        if debate_to_delete:
            try:
                psql_session.delete(debate_to_delete)
                psql_session.commit()
            except Exception as e:
                psql_session.rollback()
                raise RuntimeError(f"Failed to delete debate: {str(e)}")
        else:
            raise ValueError(f"Debate with ID {debate_id} does not exist.")


def query_debate(
    title: str | None = None,
    description: str | None = None,
    creator: str | None = None,
    start_timestamp: int | None = None,
    end_timestamp: int | None = None,
    debate_id: str | None = None,
) -> list[dict]:
    """
    Query debates based on various parameters.
    """
    with get_psql_session() as psql_session:
        query = psql_session.query(Debate)

    if debate_id:
        query = query.filter(Debate.id == debate_id)
    else:
        if title:
            query = query.filter(Debate.title.ilike(f"%{title}%"))
        if description:
            query = query.filter(Debate.description.ilike(f"%{description}%"))
        if creator:
            query = query.filter(Debate.creator.ilike(f"%{creator}%"))
        if start_timestamp:
            dt_start = datetime.datetime.fromtimestamp(start_timestamp / 1000)
            query = query.filter(Debate.created_at >= dt_start)
        if end_timestamp:
            dt_end = datetime.datetime.fromtimestamp(end_timestamp / 1000)
            query = query.filter(Debate.created_at <= dt_end)

    results = query.all()

    return [model2dict(debate) for debate in results]


def patch_debate(
    debate_id: str,
    title: str | None = None,
    description: str | None = None,
    creator: str | None = None,
):
    """
    Update an existing debate.
    """
    with get_psql_session() as psql_session:
        debate_to_update = (
            psql_session.query(Debate).filter(Debate.id == debate_id).first()
        )

        if not debate_to_update:
            raise ValueError(f"Debate with ID {debate_id} does not exist.")

        if title is not None:
            debate_to_update.title = title  # type: ignore
        if description is not None:
            debate_to_update.description = description  # type: ignore
        if creator is not None:
            debate_to_update.creator = creator  # type: ignore

        try:
            psql_session.commit()
            psql_session.refresh(debate_to_update)
        except Exception as e:
            psql_session.rollback()
            raise RuntimeError(f"Failed to update debate: {str(e)}")


def cited_in_debate(debate_id: str, opinion_id: str):
    """
    Associate a opinion with a debate.
    """
    with get_psql_session() as psql_session:
        debate = psql_session.query(Debate).filter(Debate.id == debate_id).first()

        if not debate:
            raise ValueError(f"Debate with ID {debate_id} does not exist.")

        opinion = psql_session.query(Opinion).filter(Opinion.id == opinion_id).first()

        if not opinion:
            raise ValueError(f"Opinion with ID {opinion_id} does not exist.")

        if opinion not in debate.opinions:
            debate.opinions.append(opinion)
            try:
                psql_session.commit()
                psql_session.refresh(debate)
            except Exception as e:
                psql_session.rollback()
                raise RuntimeError(f"Failed to cite opinion: {str(e)}")
        else:
            raise ValueError("Opinion is already cited in this debate.")


def get_global_debate() -> str | None:
    """
    Get the global debate with is_all=True
    """
    global _global_debate_cache
    if _global_debate_cache is not None:
        return _global_debate_cache

    with get_psql_session() as session:
        debate = session.query(Debate).filter(Debate.is_all == True).first()
        _global_debate_cache = str(debate.id) if debate else None
    return _global_debate_cache
