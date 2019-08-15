# radius-server
该项目用于第三方路由器/通用vpnserver的用户授权、记账，常用于话费、流量计费等场景
## 要点说明
- 项目提供本地及远程认证。本地认证使用的pouchDB，您可以替换为任何数据库；远程认证以HTTP方式提供，当项目分布式部署时需要使用这种认证方式，该方式支持动态伸缩。
- 远程认证方式，本项目启动时需要使用socket.io与远程认证平台的建立长链接，用于认证平台通知用户下线的消息
- 账单数据存储于本地redis，该数据是增量数据，因此无需持久化，一般用于按流量计费场景

## 使用步骤
1. 安装redis，如果使用远程redis需要修改相应配置文件
2. 项目启动
```
$start -t
```



