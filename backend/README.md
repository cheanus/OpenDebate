# backend

## 项目目录概览

项目采用模块化设计，目录和文件说明如下：

```bash
├── core       # 核心功能实现
├── main.py    # 主入口文件
├── routers    # 路由定义
├── schemas    # 数据模型定义
├── scripts    # 脚本文件
└── tests      # 测试目录
```

## 测试
项目使用 `pytest` 进行测试。可以通过以下命令运行所有测试：

```bash
cd backend
python -m pytest tests/
```
