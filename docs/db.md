## postgresql配置
debate表：
- uid: 唯一UUID
- title: 非空
- description: 描述
- created_at: 时间戳，默认当前
- creator: 字符串，非空
- is_all: 布尔，是否是全辩论

opinion表：
- id: 唯一UUID
- created_at: 时间戳，默认当前
- creator: 字符串，非空

## neo4j配置
点属性：
- uid: 同psql opinion的id
- content: 非空
- host: local或者外部URL
- logic_type：or/and，表示子节点推演本节点的逻辑
- node_type：solid/empty，表示该节点能否被引用
- intermediate: 布尔，是否是中间节点，仅供attack_link判断是否可攻击其父链
- positive_score: \[0,1\]或空，正证分
- negative_score: \[0,1\]或空，反证分
- son_positive_score: \[0,1\]或空，被支持子点的逻辑分
- son_negative_score: \[0,1\]或空，被反驳子点的逻辑分

边属性：
- uid: 唯一UUID
