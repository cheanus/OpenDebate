from fastapi import APIRouter
from schemas.ai_maker import *
from core.ai_maker import ai_build_debate_from_opinion

router = APIRouter()


@router.post("/create_debate", response_model=CreateDebateResponse)
def create_http(request: CreateDebateRequest):
    content = request.content

    # 调用核心函数实现逻辑
    try:
        id = ai_build_debate_from_opinion(content)
        result = {"is_success": True, "id": id}
    except Exception as e:
        result = {"is_success": False, "msg": str(e)}

    return result
