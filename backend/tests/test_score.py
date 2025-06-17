from pytest import approx
from core.debate import create_debate
from core.opinion import create_opinion, info_opinion
from core.link import create_link
from core.db_life import init_db, close_db
from schemas.opinion import LogicType
from schemas.link import LinkType
from tests.utils import clear_db


def positive_test(debate_id: str, op_root: str):
    op_1pos1 = create_opinion(
        content="人生的意义在于探索未知",
        creator="test_user",
        logic_type=LogicType.OR,
        positive_score=0.5,
        debate_id=debate_id,
    )
    create_link(
        from_id=op_1pos1,
        to_id=op_root,
        link_type=LinkType.SUPPORT,
    )
    op_1pos2 = create_opinion(
        content="审视人生可以帮助我们更好地理解自己",
        creator="test_user",
        logic_type=LogicType.OR,
        positive_score=0.6,
        debate_id=debate_id,
    )
    create_link(
        from_id=op_1pos2,
        to_id=op_root,
        link_type=LinkType.SUPPORT,
    )
    assert info_opinion(op_root)["score"]["positive"] == approx(0.6)


def negative_test(debate_id: str, op_root: str):
    op_1neg1 = create_opinion(
        content="人生没有意义",
        creator="test_user",
        logic_type=LogicType.OR,
        positive_score=0.6,
        debate_id=debate_id,
    )
    create_link(
        from_id=op_1neg1,
        to_id=op_root,
        link_type=LinkType.OPPOSE,
    )
    op_1neg2 = create_opinion(
        content="审视人生是徒劳的",
        creator="test_user",
        logic_type=LogicType.OR,
        positive_score=0.4,
        debate_id=debate_id,
    )
    create_link(
        from_id=op_1neg2,
        to_id=op_root,
        link_type=LinkType.OPPOSE,
    )
    assert info_opinion(op_root)["score"]["positive"] == approx(0.5)


def test_score():
    # 初始化数据库
    init_db()
    # 清空数据库
    clear_db()

    # 创建一个辩论
    debate_id = create_debate(
        title="审视人生",
        creator="user",
        description="",
    )

    # 创建观点
    op_root = create_opinion(
        content="人生应该受到审视",
        creator="test_user",
        logic_type=LogicType.OR,
        positive_score=0.8,
        debate_id=debate_id,
    )

    positive_test(debate_id, op_root)
    negative_test(debate_id, op_root)

    # 关闭数据库连接
    close_db()
