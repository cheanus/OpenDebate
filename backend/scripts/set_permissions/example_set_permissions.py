#!/usr/bin/env python3
"""
用户权限设置示例

这是一个简化的示例脚本，展示如何使用set_user_permissions.py
"""

from set_user_permissions import set_user_permissions

# 示例权限配置
permissions_config = {
    "superuser": "super0",  # 设置用户名为"admin"的用户为超级用户
    "admin": ["admin1", "admin2"],  # 设置用户名为"user1"和"user2"的用户为管理员
}

if __name__ == "__main__":
    print("执行权限设置示例...")
    print(f"配置: {permissions_config}")

    try:
        set_user_permissions(permissions_config)
        print("权限设置完成!")
    except Exception as e:
        print(f"执行失败: {e}")
