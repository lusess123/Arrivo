# Arrivo
Arrivo：突破语言的边界，就是打开世界的边界

奥地利哲学家维特根斯坦说过：“语言的边界就是世界的边界”。
语言不仅是沟通工具，更决定了我们思考、认知和理解世界的方式。

Arrivo 是一款以电影《降临》（Arrival）为灵感而诞生的语言学习软件，我们深刻认同维特根斯坦的哲学理念，致力于帮助你突破语言障碍，拓宽你认识世界的边界。

在这里，你将：

- 感受语言与思维的交汇，在语言学习中获得认知与思维的双重提升；
- 体验个性化的智能学习路径，实现高效、自然的语言掌握；、
- 通过沉浸式场景和互动教学，构建跨文化交流的自信；
- 真正领悟语言的哲学意义，理解世界，也更深入地理解自己。

加入Arrivo，突破语言的界限，拓展思维的深度与广度，与你的世界进行一次全新的连接。

Arrivo，让语言为你的世界降临。

```puml
@startuml
left to right direction

' 演员（Actors）
actor "普通用户" as User
actor "管理员" as Admin

' 系统边界
rectangle "Arrio" {

  ' 主要用例
  usecase "使用 Arrio"      as UC1
  usecase "个人管理"        as UC2
  usecase "经营后台管理"    as UC3

  ' 次级用例
  usecase "AI跟读"         as UC4
  usecase "文章管理"       as UC5
  usecase "用户管理"       as UC6
  usecase "素材管理"       as UC7

  ' <<include>> 关系（虚线箭头指向被包含用例）
  UC1 --> UC4 : <<include>>
  UC2 --> UC5 : <<include>>
  UC3 --> UC6 : <<include>>
  UC3 --> UC7 : <<include>>
}

' 演员与用例之间的关联
User  --> UC1
User  --> UC2
Admin --> UC3

@enduml
```



```puml
@startuml
' 布局从上到下
left to right direction

' ---- 节点定义 ----
rectangle "arrivo-H5"  as H5
rectangle "arrivo-fe"  as FE
rectangle "arrivo-server" as Server

database "数据库"       as DB
rectangle "TTS Server" as TTS
rectangle "OSS Server" as OSS
rectangle "SMS Server" as SMS

' ---- 连接关系 ----
H5  --> Server
FE  --> Server

Server --> DB
Server --> TTS
Server --> OSS
Server --> SMS
@enduml
```


![](https://cdn.nlark.com/yuque/__puml/3eaca7abea2d571af72f1c535fabeb4c.svg)
