# 用户权限设置脚本

## 功能说明

这个脚本用于批量设置用户权限，支持以下操作：
- 设置超级用户（superuser）：`is_superuser=True` 且 `role="admin"`
- 设置管理员（admin）：`role="admin"`

## 文件说明

- `set_user_permissions.py` - 主脚本文件
- `example_set_permissions.py` - 使用示例
- `README.md` - 本说明文档

## 使用方法

### 1. 直接运行（交互式）

```bash
cd backend/scripts
python set_user_permissions.py
```

程序会提示输入权限配置的JSON格式，或直接回车使用示例配置。

### 2. 命令行参数

```bash
cd backend/scripts
python set_user_permissions.py '{"superuser": "admin", "admin": ["user1", "user2"]}'
```

### 3. 程序调用

```python
from set_user_permissions import set_user_permissions

permissions = {
    "superuser": "admin",       # 设置用户名为"admin"的用户为超级用户
    "admin": ["user1", "user2"] # 设置用户名为"user1"和"user2"的用户为管理员
}

set_user_permissions(permissions)
```

## 权限配置格式

```json
{
    "superuser": "USERNAME1",      # 单个超级用户
    "admin": ["u2", "u3"]          # 多个管理员用户
}
```

- `superuser`：设置单个用户为超级用户，该用户将拥有 `is_superuser=True` 和 `role="admin"`
- `admin`：设置一个或多个用户为管理员，这些用户将拥有 `role="admin"`

## 查看用户列表

```bash
cd backend/scripts
python set_user_permissions.py --list
```

## 注意事项

1. 脚本需要在backend目录下运行，或确保Python路径包含backend目录
2. 需要先初始化数据库连接
3. 如果指定的用户名不存在，会显示警告信息但不会中断执行
4. 执行前会显示即将执行的操作并要求确认

## 示例输出

```
用户权限设置脚本
==================================================
示例配置: {
  "superuser": "admin",
  "admin": [
    "user1",
    "user2"
  ]
}

请输入权限配置 (JSON格式，直接回车使用示例配置):

即将执行的操作:
  设置超级用户: admin
  设置管理员: user1, user2

确认执行? (y/N): y
✓ 已设置用户 'admin' 为超级用户
✓ 已设置用户 'user1' 为管理员
✓ 已设置用户 'user2' 为管理员

权限设置完成!
```