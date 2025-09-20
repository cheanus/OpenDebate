#!/usr/bin/env python3
"""
用户权限设置脚本

用于批量设置用户权限。支持设置superuser和admin权限。

使用方法:
    python set_user_permissions.py

示例权限配置:
    {"superuser": "admin", "admin": ["user1", "user2"]}

权限说明:
    - superuser: 设置is_superuser=True和role="admin"
    - admin: 设置role="admin"
"""

import sys
import os
import json
import pathlib
from typing import Dict, List, Union

# 添加项目根目录到路径
# 添加项目根目录到路径
project_root = pathlib.Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from core.db_life import init_db, get_psql_session
from schemas.db.psql import User


def set_user_permissions(permissions: Dict[str, Union[str, List[str]]]) -> None:
    """
    根据给定的权限字典设置用户权限

    Args:
        permissions: 权限配置字典
            格式: {"superuser": "username", "admin": ["user1", "user2"]}
    """
    # 初始化数据库连接
    init_db()

    with get_psql_session() as session:
        # 处理superuser权限
        if "superuser" in permissions:
            superuser_username = permissions["superuser"]
            if superuser_username:
                user = (
                    session.query(User)
                    .filter(User.username == superuser_username)
                    .first()
                )
                if user:
                    user.is_superuser = True
                    user.role = "admin"
                    session.commit()
                    print(f"✓ 已设置用户 '{superuser_username}' 为超级用户")
                else:
                    print(f"✗ 未找到用户名为 '{superuser_username}' 的用户")

        # 处理admin权限
        if "admin" in permissions:
            admin_usernames = permissions["admin"]
            if isinstance(admin_usernames, str):
                admin_usernames = [admin_usernames]

            for username in admin_usernames:
                user = session.query(User).filter(User.username == username).first()
                if user:
                    user.role = "admin"
                    session.commit()
                    print(f"✓ 已设置用户 '{username}' 为管理员")
                else:
                    print(f"✗ 未找到用户名为 '{username}' 的用户")


def main():
    """主函数，可以通过命令行参数或交互式输入权限配置"""

    # 示例配置
    example_permissions = {"superuser": "admin", "admin": ["user1", "user2"]}

    print("用户权限设置脚本")
    print("=" * 50)

    # 如果有命令行参数，尝试解析为JSON
    if len(sys.argv) > 1:
        try:
            permissions_json = sys.argv[1]
            permissions = json.loads(permissions_json)
            print(f"使用命令行参数: {permissions}")
        except json.JSONDecodeError:
            print("命令行参数JSON格式错误")
            return
    else:
        # 交互式输入
        print(
            f"示例配置: {json.dumps(example_permissions, ensure_ascii=False, indent=2)}"
        )
        print("\n请输入权限配置 (JSON格式，直接回车使用示例配置):")

        user_input = input().strip()

        if not user_input:
            permissions = example_permissions
            print("使用示例配置")
        else:
            try:
                permissions = json.loads(user_input)
            except json.JSONDecodeError:
                print("JSON格式错误")
                return

    # 验证输入格式
    if not isinstance(permissions, dict):
        print("权限配置必须是字典格式")
        return

    # 显示即将执行的操作
    print("\n即将执行的操作:")
    if "superuser" in permissions:
        print(f"  设置超级用户: {permissions['superuser']}")
    if "admin" in permissions:
        admin_users = permissions["admin"]
        if isinstance(admin_users, str):
            admin_users = [admin_users]
        print(f"  设置管理员: {', '.join(admin_users)}")

    # 确认执行
    confirm = input("\n确认执行? (y/N): ").strip().lower()
    if confirm != "y":
        print("操作已取消")
        return

    try:
        set_user_permissions(permissions)
        print("\n权限设置完成!")
    except Exception as e:
        print(f"\n执行过程中出现错误: {e}")


def list_users():
    """列出所有用户及其当前权限"""
    init_db()

    with get_psql_session() as session:
        users = session.query(User).all()

        print("当前所有用户:")
        print("-" * 60)
        print(f"{'用户名':<20} {'角色':<10} {'超级用户':<10} {'邮箱':<20}")
        print("-" * 60)

        for user in users:
            superuser_status = "是" if user.is_superuser else "否"
            print(
                f"{user.username:<20} {user.role:<10} {superuser_status:<10} {user.email:<20}"
            )


if __name__ == "__main__":
    # 检查是否要列出用户
    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        list_users()
    else:
        main()
