from pytest import approx
from core.debate import create_debate, get_global_debate
from core.opinion import create_or_opinion, create_and_opinion, info_opinion, patch_opinion
from core.link import create_link, attack_link
from core.db_life import init_db, close_db
from core.utils.debate import init_global_debate
from schemas.link import LinkType
from tests.utils import clear_db


def positive_test(debate_id: str, op_root: str):
    op_1pos1 = create_or_opinion(
        content="人生的意义在于探索未知",
        creator="test_user",
        debate_id=debate_id,
    )
    create_link(
        from_id=op_1pos1,
        to_id=op_root,
        link_type=LinkType.SUPPORT,
    )
    op_1pos2 = create_or_opinion(
        content="审视人生可以帮助我们更好地理解自己",
        creator="test_user",
        debate_id=debate_id,
    )
    create_link(
        from_id=op_1pos2,
        to_id=op_root,
        link_type=LinkType.SUPPORT,
    )

    op_1pos1pos1 = create_or_opinion(
        content="未知的探索可以带来新的视角",
        creator="test_user",
        positive_score=0.1,
        debate_id=debate_id,
    )
    create_link(
        from_id=op_1pos1pos1,
        to_id=op_1pos1,
        link_type=LinkType.SUPPORT,
    )
    op_1pos1pos2 = create_or_opinion(
        content="未知带来快乐",
        creator="test_user",
        # positive_score=0.2,
        debate_id=debate_id,
    )
    create_link(
        from_id=op_1pos1pos2,
        to_id=op_1pos1,
        link_type=LinkType.SUPPORT,
    )
    patch_opinion(
        opinion_id=op_1pos1pos2,
        score={"positive": 0.2},
    )

    op_1pos2pos1 = create_or_opinion(
        content="理解自己可以帮助我们更好地生活",
        creator="test_user",
        positive_score=0.3,
        debate_id=debate_id,
    )
    create_link(
        from_id=op_1pos2pos1,
        to_id=op_1pos2,
        link_type=LinkType.SUPPORT,
    )
    op_1pos2pos2 = create_or_opinion(
        content="理解自己可以带来内心的平静",
        creator="test_user",
        positive_score=0.4,
        debate_id=debate_id,
    )
    rel_1pos2pos2, _ = create_link(
        from_id=op_1pos2pos2,
        to_id=op_1pos2,
        link_type=LinkType.SUPPORT,
    )
    attack_link(rel_1pos2pos2, debate_id)


def negative_test(debate_id: str, op_root: str):
    op_1neg1pos1 = create_or_opinion(
        content="人生没有意义",
        creator="test_user",
        debate_id=debate_id,
        positive_score=0.5,
    )
    op_1neg1pos2 = create_or_opinion(
        content="审视人生是徒劳的",
        creator="test_user",
        debate_id=debate_id,
        positive_score=0.6,
    )
    op_1neg1, _, _ = create_and_opinion(
        parent_id=op_root,
        son_ids=[op_1neg1pos1, op_1neg1pos2],
        link_type=LinkType.OPPOSE,
        creator="test_user",
        debate_id=debate_id,
    )

    assert info_opinion(op_1neg1)["score"]["positive"] == approx(
        0.5
    ), "Negative opinion's positive score should be 0.5"

    op_1neg2pos1 = create_or_opinion(
        content="审视不能改变人生的本质",
        creator="test_user",
        debate_id=debate_id,
        positive_score=0.7,
    )
    op_1neg2pos2 = create_or_opinion(
        content="人生的本质在于接受",
        creator="test_user",
        debate_id=debate_id,
        positive_score=0.8,
    )
    op_1neg2, _, _ = create_and_opinion(
        parent_id=op_root,
        son_ids=[op_1neg2pos1, op_1neg2pos2],
        link_type=LinkType.OPPOSE,
        creator="test_user",
        debate_id=debate_id,
    )
    assert info_opinion(op_1neg2)["score"]["negative"] == approx(
        0.6
    ), "Root opinion's negative score should be 0.6"
    assert info_opinion(op_1neg2pos1)["score"]["negative"] == approx(
        0.6
    ), "Root opinion's negative score should be 0.6"


def test_score():
    # 初始化数据库
    init_db()
    # 清空数据库
    clear_db()
    # 初始化全局辩论
    init_global_debate()

    # 创建一个辩论
    debate_id = create_debate(
        title="审视人生",
        creator="user",
        description="",
    )

    # 创建观点
    op_root = create_or_opinion(
        content="人生应该受到审视",
        creator="test_user",
        debate_id=debate_id,
    )

    positive_test(debate_id, op_root)
    negative_test(debate_id, op_root)

    assert info_opinion(op_root)["score"]["positive"] == approx(
        0.35
    ), "Root opinion's positive score should be 0.35"

    # 关闭数据库连接
    close_db()
