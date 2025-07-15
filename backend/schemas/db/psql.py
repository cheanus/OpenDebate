from sqlalchemy import Column, Text, TIMESTAMP, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

# 创建基类
DbBase = declarative_base()

# ================== 中间表（association table） ==================
debate_opinion_association = Table(
    "debate_opinion",
    DbBase.metadata,
    Column(
        "debate_id",
        UUID(as_uuid=True),
        ForeignKey("debate.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "opinion_id",
        UUID(as_uuid=True),
        ForeignKey("opinion.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ================== Debate 表 ==================
class Debate(DbBase):
    __tablename__ = "debate"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    creator = Column(Text, nullable=False)

    # 多对多关系，通过中间表
    opinions = relationship(
        "Opinion",
        secondary=debate_opinion_association,
        back_populates="debates",
        passive_deletes=True,
    )


# ================== Opinion 表 ==================
class Opinion(DbBase):
    __tablename__ = "opinion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(TIMESTAMP, server_default=func.now())
    creator = Column(Text, nullable=False)

    debates = relationship(
        "Debate",
        secondary=debate_opinion_association,
        back_populates="opinions",
        passive_deletes=True,
    )


def model2dict(model) -> dict:
    """
    Convert a SQLAlchemy model instance to a dictionary.
    For TIMESTAMP columns, convert to JS milliseconds (int).
    """
    result = {}
    for column in model.__table__.columns:
        value = getattr(model, column.name)
        # 判断是否为TIMESTAMP类型
        if str(column.type) == "TIMESTAMP" and value is not None:
            # 转换为毫秒时间戳
            value = int(value.timestamp() * 1000)
        result[column.name] = value
    return result
