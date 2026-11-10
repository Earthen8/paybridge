.PHONY: help up down restart logs ps setup dev dev-backend dev-frontend build clean test-db

# Default target
help:
	@echo "======================================================================="
	@echo "                      PayBridge Makefile Commands                      "
	@echo "======================================================================="
	@echo " Docker & Database Commands:"
	@echo "   make up            - Menjalankan container PostgreSQL (docker compose up -d)"
	@echo "   make down          - Menghentikan container PostgreSQL"
	@echo "   make restart       - Restart container PostgreSQL"
	@echo "   make logs          - Melihat logs container PostgreSQL"
	@echo "   make ps            - Cek status container PostgreSQL"
	@echo "   make test-db       - Menjalankan migrasi & seed database awal"
	@echo ""
	@echo " Development & App Commands:"
	@echo "   make setup         - Install dependensi, jalankan DB, migrasi, dan seed"
	@echo "   make dev-backend   - Menjalankan backend server (Express: port 4000)"
	@echo "   make dev-frontend  - Menjalankan frontend UI (Vite: port 5173)"
	@echo "   make build         - Build production untuk backend dan frontend"
	@echo "   make clean         - Hapus node_modules dan dist folders"
	@echo "======================================================================="

# Docker commands
up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f postgres

ps:
	docker compose ps

# Database migration & seeding
test-db:
	npm run db:push
	npm run db:seed

# Complete initial setup
setup: up
	npm install
	npm run db:generate
	npm run db:push
	npm run db:seed
	@echo "Setup selesai! Jalankan 'make dev-backend' dan 'make dev-frontend' di terminal terpisah."

# App runners
dev-backend:
	npm run dev:backend

dev-frontend:
	npm run dev:frontend

build:
	npm run build

clean:
	@echo "Membersihkan dist & build artifacts..."
	powershell -Command "Remove-Item -Recurse -Force backend/dist, frontend/dist -ErrorAction SilentlyContinue"

