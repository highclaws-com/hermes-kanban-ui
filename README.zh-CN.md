# Hermes Kanban UI

[English](./README.md) | [简体中文](./README.zh-CN.md)

独立的 Hermes 看板界面，仅挂载 Kanban API，不暴露 Hermes 主仪表盘、模型、密钥或配置界面。

## 界面预览

![Hermes Kanban UI 界面截图](./screenshot.png)

## 沙箱配置

请使用与现有 Hermes 相同的系统用户运行。后端会从 `HERMES_SOURCE` 导入 Hermes 官方 Kanban 插件，并沿用相同的 `HOME`/`HERMES_HOME`，因此能读取现有 Profile、看板数据库和 Profile 凭据。

```bash
command -v hermes
hermes doctor
hermes profile list

cd /worktrees/folder-1/hermes-kanban-ui
npm ci
npm test
npm run build
HERMES_SOURCE=/home/agent/hermes \
HERMES_KANBAN_BOARD=hermes-kanban \
npm start

curl -fsS http://127.0.0.1:8002/api/health
```

在 HighClaws 沙箱中需要持久运行时，把相同启动命令写入 `/home/agent/.supervisor/conf.d/hermes-kanban-ui.conf`，再执行 Supervisor 的 `reread` 和 `update`。

### Hermes Profile 与 API 权限

- UI 中的 Profile 来自现有 Hermes 安装，不会把模型凭据复制到本仓库。
- 本项目直接调用导入的本地 Kanban API，因此**不需要** `API_SERVER_KEY`。
- 如果其他可信的服务端程序需要访问 Hermes 的 OpenAI 兼容 HTTP API，可执行：

```bash
hermes config set API_SERVER_ENABLED true
API_SERVER_KEY="$(openssl rand -hex 32)"
hermes config set API_SERVER_KEY "$API_SERVER_KEY"
hermes gateway restart
curl -fsS http://127.0.0.1:8642/health
API_SERVER_KEY="$(python3 -c 'import os; print(next(line.split("=",1)[1] for line in open(os.path.expanduser("~/.hermes/.env")) if line.startswith("API_SERVER_KEY=")), end="")')"
curl -H "Authorization: Bearer $API_SERVER_KEY" \
  http://127.0.0.1:8642/v1/models
```

密钥保存在 `~/.hermes/.env`。不要提交密钥、不要放入浏览器端代码，也不要把 `8642` 端口直接暴露到公网。

服务默认绑定 `127.0.0.1`，没有应用层登录。远程访问时应放在带身份验证的 Gateway 或私有隧道后面，不要直接暴露。

环境变量：

- `HERMES_SOURCE`：Hermes 源码路径，默认 `/home/agent/hermes`
- `HERMES_KANBAN_BOARD`：Hermes Kanban 后端使用的看板名
- `HOME` / `HERMES_HOME`：指定要复用的 Hermes 安装和 Profile
- `HOST`：监听地址，默认 `127.0.0.1`
- `PORT`：监听端口，默认 `8002`
