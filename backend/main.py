from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import debate, opinion, link, ai_maker
from config_private import CORS_ALLOW_ORIGIN, LOG_LEVEL
from core.db_life import init_db, close_db
from core.utils.debate import init_global_debate
import uvicorn.config
import uvicorn


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("✅ Database initialized")
    init_global_debate()
    print("✅ 'Global' debate initialized")
    yield
    close_db()
    print("❎ Database closed")


app = FastAPI(
    lifespan=lifespan,
)

# 跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGIN,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 分发路由
app.include_router(opinion.router, prefix="/api/opinion", tags=["opinion"])
app.include_router(link.router, prefix="/api/link", tags=["link"])
app.include_router(debate.router, prefix="/api/debate", tags=["debate"])
app.include_router(ai_maker.router, prefix="/api/ai", tags=["ai"])


@app.get("/api/")
def read_root():
    return {"Hello": "World"}


if __name__ == "__main__":
    log_config = uvicorn.config.LOGGING_CONFIG
    log_config["formatters"]["access"][
        "fmt"
    ] = "%(asctime)s - %(levelname)s - %(message)s"
    log_config["formatters"]["default"][
        "fmt"
    ] = "%(asctime)s - %(levelname)s - %(message)s"
    uvicorn.run(
        app, host="127.0.0.1", port=3142, log_config=log_config, log_level=LOG_LEVEL
    )
