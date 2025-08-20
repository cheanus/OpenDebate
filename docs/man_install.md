# 手动安装

首先确保安装了 Python、Node.js、PostgreSQL 和 Neo4j (community)。

*安装什么版本？应该安装最新稳定版！激进的项目总是应该使用最新的技术。*

## 克隆项目
```bash
# 克隆项目
git clone https://github.com/cheanus/OpenDebate.git
cd OpenDebate
```

## 数据库配置
1. 创建 postgresql 新用户或使用现有用户
2. 创建 postgresql 新数据库 `debatedb`
3. 安装 Neo4j (community) 后设置用户名和密码
4. 创建 [backend/config.py](../backend/config.py) 副本`config_private.py`，添加数据库连接信息，包括`NEO4J_URI`、`NEO4J_USER`、`NEO4J_PASSWORD`、`psql_config` 等。若使用默认配置，记得修改各数据库**端口号**
    ```bash
    cd backend
    cp config.py config_private.py
    # 编辑 config_private.py
    ```

## 后端启动
```bash
# 后端启动
cd backend
python3 -m venv venv  # 创建虚拟环境，或者也可以使用 conda
source venv/bin/activate
pip install -r requirements.txt
python main.oy
```

## 前端启动
```bash
# 前端启动
cd ../frontend
pnpm install  # 或 npm install
pnpm dev  # 或 npm run dev
```

访问 http://localhost:3141 即可体验。
