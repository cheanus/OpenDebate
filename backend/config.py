# 前端服务的基础URL
FRONTEND_BASEURL = "http://localhost:3141"
# 后端服务的基础URL
BACKEND_BASEURL = "http://localhost:3142"
BACKEND_API_BASEURL = BACKEND_BASEURL + "/api"

# 日志等级：debug, info, warning, error, critical
LOG_LEVEL = "info"

# neo4j 数据库配置
NEO4J_URI = "localhost:3145"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "neo4jpass"

# PostgreSQL 数据库配置
psql_config = {
    'dbname': 'debatedb',
    'user': 'debateuser',
    'password': 'debatepass',
    'host': 'localhost',
    'port': '3143'
}

# OpenAI格式 API 配置
MODEL = "deepseek-chat"
BASE_URL = "https://api.deepseek.com"
API_KEY = "sk-***"

# 链有效性阈值
LINK_REASONABLENESS_THRESHOLD = 0.6

# CORS
CORS_ALLOW_ORIGIN = [
    FRONTEND_BASEURL,
    BACKEND_BASEURL,
]