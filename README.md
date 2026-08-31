# Hermes Kanban UI

独立的 Hermes 看板界面，仅挂载 Kanban API，不暴露 Hermes 主仪表盘、模型、密钥或配置界面。

## 界面预览

![Hermes Kanban UI 界面截图](./screenshot.png)

## 运行

```bash
npm test
npm run build
npm start
# http://127.0.0.1:8002
```

默认绑定 `127.0.0.1`，未提供应用层登录。需要远程访问时，请使用带身份验证的私有隧道（Tailscale/SSH tunnel 等），不要直接暴露公网。

环境变量：

- `HERMES_SOURCE`：Hermes 源码路径，默认 `/home/agent/hermes`
- `HOST`：监听地址，默认 `127.0.0.1`
- `PORT`：监听端口，默认 `8002`
