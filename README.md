# Hermes Kanban UI

[English](./README.md) | [简体中文](./README.zh-CN.md)

A standalone Kanban interface for Hermes Agent. It exposes only the Kanban API and does not expose the main Hermes dashboard, models, secrets, or configuration pages.

## Preview

![Hermes Kanban UI screenshot](./screenshot.png)

## Run

```bash
npm test
npm run build
npm start
# http://127.0.0.1:8002
```

The server binds to `127.0.0.1` by default and does not provide application-level authentication. For remote access, use a private authenticated tunnel such as Tailscale or an SSH tunnel. Do not expose it directly to the public internet.

Environment variables:

- `HERMES_SOURCE`: Path to the Hermes source tree. Defaults to `/home/agent/hermes`.
- `HOST`: Listening address. Defaults to `127.0.0.1`.
- `PORT`: Listening port. Defaults to `8002`.
