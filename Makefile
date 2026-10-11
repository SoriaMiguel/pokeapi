.PHONY: setup backend-sync frontend-sync build test dev dev-api dev-web container-build container-up container-down clean

setup: backend-sync frontend-sync

backend-sync:
	uv sync --project backend --frozen

frontend-sync:
	cd frontend && bun install --frozen-lockfile

build: setup
	uv run --project backend python -m compileall -q backend
	cd frontend && bun run build

test: backend-sync
	uv run --project backend pytest backend/test_main.py

dev: setup
	exec ./scripts/dev.sh

dev-api: backend-sync
	uv run --project backend uvicorn backend.main:app --reload --port 8000

dev-web: frontend-sync
	cd frontend && bun run dev

container-build:
	docker compose build

container-up:
	docker compose up --build -d

container-down:
	docker compose down

clean:
	rm -rf backend/.venv backend/.pytest_cache backend/__pycache__ frontend/node_modules frontend/dist
