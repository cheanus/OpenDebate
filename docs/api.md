## 🌐 总

基础路径：`/api`
所有响应数据均为JSON格式，都携带`is_success`字段，表示操作是否成功，若失败则携带`msg`字段，即：

```json
{
  "is_success": false,
  "msg": "错误信息",
  "A": "...",
  "B": "..."
}
```
所有时间戳均为Unix时间戳（整型毫秒级）。

---

## 📁 辩论 Debate

### ➕ 添加辩论

`POST /debate/create`  
**Body**

```json
{
  "title": "AI是否应拥有意识",
  "description": "探讨人工智能是否应该具备自主意识。",
  "creator": "user1"
}
```

返回debate_id。

```json
{
  "id": "xxx"
}
```

### ❌ 删除辩论

`POST /debate/delete`
**Body**

```json
{
  "id": "xxx"
}
```

### 🔍 条件查询辩论信息

`GET /debate/query?title=AI&...`

- description
- creator
- start_timestamp
- end_timestamp
- debate_id

返回匹配的辩论列表，元素参考数据库。
有`debate_id`的话就直接返回一个数据了，其他情况模糊查询。

返回示例：

```json
{
  "data": [
    {
      "id": "xxx",
      "title": "AI是否应拥有意识",
      "description": "探讨人工智能是否应该具备自主意识。",
      "created_at": 1700000000,
      "creator": "user1"
    }
  ]
}
```

### ✏️ 修改辩论信息

`POST /debate/patch`  
**Body (任意字段)**

```json
{
  "id": "xxx",
  "title": "修改后的标题",
  "description": "新的描述",
  "creator": "user2"
}
```

`id`必选，其他可选。

### ➕ 建立辩论与某已有观点的关系
考虑到有些辩论要引用某观点，或者某观点要添加到某辩论中去。

`POST /debate/cite`  
**Body**

```json
{
  "debate_id": "xxx",
  "opinion_id": "xxx"
}
```

---

## 📁 观点 Opinion

### ➕ 添加单个或观点

`POST /opinion/create_or`  
**Body**

```json
{
  "content": "AI不具备主观体验，因此不应有意识。",
  "positive_score": 0.7,
  "logic_type": "or",
  "is_llm_score": false,
  "creator": "user1",
  "debate_id": "xxx"
}
```

`debate_id`可选，代表新观点放在哪个辩论里。默认为空代表**全辩论**（容纳了所有观点）。
`logic_type`可选，默认为or。
`is_llm_score`可选，默认为false，表示该观点不自动调用LLM生成分数。

返回示例：

```json
{
  "id": "xxx"
}
```

### ➕ 添加单个与观点

`POST /opinion/create_and`  
**Body**

```json
{
  "parent_id": "xxx",
  "son_ids": ["yyy", "zzz"],
  "link_type": "supports",
  "creator": "user1",
  "host": "local",
  "debate_id": "xxx"
}
```

`parent_id`是父观点，`son_ids`是子观点列表。
`debate_id`可选，代表新观点放在哪个辩论里，默认为空代表**全辩论**。

返回示例：

```json
{
  "id": "xxx"
}
```

### ❌ 删除辩论中的单个观点及其所有链

`POST /opinion/delete`
**Body**

```json
{
  "opinion_id": "xxx",
  "debate_id": "xxx"
}
```

`debate_id`可选，空则删除全部辩论中的该观点。

### 🔍 查询观点信息及其链

`GET /opinion/info?opinion_id=xxx&debate_id=xxx`

`debate_id`可选，默认设定为全辩论。

返回示例：

```json
{
  "data": {
    "id": "xxx",
    "created_at": 1700000000,
    "creator": "user1",
    "content": "AI不具备主观体验，因此不应有意识。",
    "host": "local",
    "logic_type": "or",
    "node_type": "solid",
    "score": {
      "positive": 0.7,
      "negative": 0.3
    },
    "relationship": {
      "supports": ["link_id1", "link_id2"],
      "opposes": ["link_id3"],
      "supported_by": ["link_id4"],
      "opposed_by": ["link_id5"]
    }
  }
}
```

### 🔍 条件模糊查询观点信息

`GET /opinion/query?q=AI&debate_id=xxx&min_score=0.5&max_score=0.9&is_time_accending=true&max_num=20`  

其他情况模糊查询，`q`和`debate_id`二选一，后者为空即设定为全辩论。
`is_time_accending`是可选的，默认为true，表示结果按创建时间升序排。
`max_num`是可选的，默认为20，最多为100，表示返回的最大观点数量。
返回匹配的观点列表（数据参考数据库），相较info接口，返回更少字段。

返回示例：

```json
{
  "data": [
    {
      "id": "xxx",
      "created_at": 1700000000,
      "creator": "user1",
      "content": "AI不具备主观体验，因此不应有意识。",
      "host": "local",
      "logic_type": "or",
      "node_type": "solid",
      "score": {
        "positive": 0.7,
        "negative": 0.3
      }
    }
  ]
}
```

### 🔍 查询观点的叶或根节点

`POST /opinion/head`
**Body**
```json
{
  "debate_id": "xxx",
  "is_root": true
}
```

返回该观点的所有叶节点（一般作为所有观点的假设的观点）或根节点的id列表，示例：

```json
{
  "data": [
    "xxx",
    "yyy"
  ]
}
```

### ✏️ 修改观点信息（包括LLM赋分）

`POST/opinion/patch`  
**Body**

```json
{
  "id": "xxx",
  "content": "修改后的观点内容",
  "score": {
    "positive": 0.8
  },
  "is_llm_score": false,
  "creator": "user1"
}
```

`id`必选，其他可选。
`score`可选，只能包含`positive`键，表示新的正证分数，其值为浮点数或`None`（表示不提供分数）。
`is_llm_score`默认false，若true则`score`无效，后端会自己调用LLM生成分数。

---

## 📁 链 Link

### ➕ 添加链（两个已存在观点间）

`POST /link/create`  
**Body**

```json
{
  "from_id": "xxx",
  "to_id": "yyy",
  "link_type": "supports"
}
```

返回示例：

```json
{
  "id": "link_id"
}
```

如果存在相同属性的link，则返回已有的link_id。

### ❌ 删除链（两个已存在观点间）

`POST /link/delete`

```json
{
  "id": "xxx"
}
```

### 🔍 查询链信息

`GET /link/info?link_id=xxx`

返回示例：

```json
{
  "id": "xxx",
  "from_id": "opinion1",
  "to_id": "opinion2",
  "link_type": "supports"
}
```

### ✏️ 修改链信息

`POST /link/patch`  
**Body**

```json
{
  "id": "xxx",
  "link_type": "supports"
}
```

### 🚀 对链辩论

考虑到有些链需要辩论，因而在链上插入一个与观点，用一个或观点支持它，该或观点表示链是正确的，可被辩论。

`POST /link/attack`  
**Body**
```json
{
  "link_id": "xxx",
  "debate_id": "xxx"
}
```

`debate_id`，代表新观点放在哪个辩论里。默认为空代表**全辩论**。
返回示例：

```json
{
  "or_id": "or_opinion_id",
  "and_id": "and_opinion_id"
}
```
