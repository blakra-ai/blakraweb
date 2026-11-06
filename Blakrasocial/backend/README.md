# Blakrasocial backend

FastAPI service for the Social Publisher. Setup, architecture, security and limitations are in the
[project README](../README.md).

```bash
uv sync && uv run uvicorn blakrasocial.main:app_factory --factory --reload
uv run pytest
```
