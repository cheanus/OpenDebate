## 🌐 总

基础路径：`/api`

---

## 📁 辩论 Debate

### ➕ 添加辩论

`POST /debates/create`  
**Body**

```json
{
  "title": "AI是否应拥有意识",
  "description": "探讨人工智能是否应该具备自主意识。",
  "creator": "user1"
}
```

### ❌ 删除辩论

`POST /debates/delete`
**Body**

```json
{
  "id": "xxx",
}
```

### 🔍 条件查询辩论信息

`GET /debates/query?title=AI&...`

- description
- creator
- start_timestamp
- end_timestamp
- debate_id

返回匹配的辩论列表，元素参考数据库。
有`debate_id`的话就直接返回一个数据了，其他情况模糊查询。

### ✏️ 修改辩论信息

`POST /debates/patch`  
**Body (任意字段)**

```json
{
  "id": "xxx",
  "patch": {
	  "title": "修改后的标题",
	  "description": "新的描述",
	  ...
  }
}
```

`id`必选，其他可选。

### ➕ 建立辩论与某已有观点的关系
考虑到有些辩论要引用某观点，或者某观点要添加到某辩论中去。

`POST /debates/cite`  
**Body**

```json
{
  "debate_id": "xxx",
  "opinion_id": "xxx",
}
```

---

## 📁 观点 Opinion

### ➕ 添加单个观点

`POST /opinions/create`  
**Body**

```json
{
  "content": "AI不具备主观体验，因此不应有意识。",
  "positive_score": 0.7,
  "logic_type": "or",
  "is_llm_score": false,
  "creator": "user1",
  "debate_id": "xxx",
}
```

`debate_id`可选的，默认辩论叫**全辩论**，容纳了所有观点。
`logic_type`可选，默认为or。
`is_llm`可选，默认为false，表示该观点分数不是LLM生成的。

### ❌ 删除辩论中的单个观点及其所有链

`POST /opinions/delete`
**Body**

```json
{
  "opinion_id": "xxx",
  "debate_id": "xxx（可选）"
}
```

`debate_id`可选，空则删除全部辩论中的该观点。

### 🔍 查询观点信息及其链

`GET /opinions/info?opinion_id=xxx&debate_id=xxx`

`debate_id`可选，默认设定为全辩论。
返回数据参考观点表和链表。

### 🔍 条件模糊查询观点信息

`GET /opinions/query?q=AI&debate_id=xxx&min_score=0.5&max_score=0.9`  

其他情况模糊查询，`q`和`debate_id`二选一，后者为空即设定为全辩论。
返回匹配的观点列表（数据参考数据库），相较info接口，返回更少字段。

### ✏️ 修改观点信息（包括LLM赋分）

`POST/opinions/patch`  
**Body**

```json
{
  "id": "xxx",
  "content": "修改后的观点内容",
  "positive_socre": 0.8,
  "is_llm_score": false,
  "creator": "user1",
}
```

`id`必选，其他可选。
`is_llm_score`默认false，若true则`score`无效，后端会自己调用LLM生成分数。

---

## 📁 链 Link

### ➕ 添加链（两个已存在观点间）

`POST /links/create`  
**Body**

```json
{
  "from_id": "xxx",
  "to_id": "yyy",
  "link_type": "support",
}
```

如果存在相同属性的link，则返回已有的link_id。

### ❌ 删除链（两个已存在观点间）

`POST /links/delete`

```json
{
  "id": "xxx",
}
```

### 🔍 查询链信息

`GET /links/info?link_id=xxx`
返回链的详细信息，包括`from_id`、`to_id`、`link_type`等。

### ✏️ 修改链信息

`POST /links/patch`  
**Body**

```json
{
  "id": "xxx",
  "link_type": "support",
}
```
