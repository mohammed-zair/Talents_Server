#!/bin/bash
set -e

BASE_DIR="$HOME/projects/job_gate"

BACKEND_DIR="$BASE_DIR/job_gate_backend"
ADMIN_DIR="$BASE_DIR/job_gate_admin"
AI_DIR="$BASE_DIR/job_gate_ai"

echo "======================================"
echo "🚀 Deploying FULL Job-Gate Project..."
echo "======================================"

update_repo() {
  local DIR=$1
  echo ""
  echo "📌 Updating repo: $DIR"
  cd "$DIR"

  echo "🧹 Cleaning local changes..."
  git reset --hard
  git clean -fd

  echo "⬇️ Pulling latest code..."
  git pull origin main
}

install_node() {
  local DIR=$1
  echo "📦 Installing Node dependencies in $DIR ..."
  cd "$DIR"
  npm install --production
}

restart_pm2_backend() {
  echo "🔄 Restarting backend (job-gate-backend)..."
  pm2 restart job-gate-backend --update-env || pm2 start server.js --name job-gate-backend --update-env
}

restart_pm2_ai() {
  echo "🔄 Restarting AI (job-gate-ai)..."
  cd "$AI_DIR"

  if [ -f "run.py" ]; then
    pm2 restart job-gate-ai --update-env || pm2 start run.py --name job-gate-ai --interpreter python3 --update-env
  else
    echo "❌ run.py not found in AI directory!"
    exit 1
  fi
}

# =========================
# ✅ BACKEND
# =========================
echo ""
echo "✅ Step 1: Update BACKEND"
echo "--------------------------------------"
update_repo "$BACKEND_DIR"
install_node "$BACKEND_DIR"
restart_pm2_backend

# =========================
# ✅ ADMIN (React)
# =========================
echo ""
echo "✅ Step 2: Update ADMIN"
echo "--------------------------------------"
update_repo "$ADMIN_DIR"

echo "📦 Installing admin dependencies..."
cd "$ADMIN_DIR"
npm install

echo "🏗️ Building admin production build..."
npm run build

# =========================
# ✅ AI Service (Python)
# =========================
echo ""
echo "✅ Step 3: Update AI Service"
echo "--------------------------------------"
update_repo "$AI_DIR"

cd "$AI_DIR"

echo "🐍 Python AI detected..."

echo "✅ Updating requirements for Python 3.13 compatibility..."
cat > requirements.txt <<'REQ'
fastapi>=0.115.0
uvicorn>=0.30.0
python-multipart>=0.0.9
sqlalchemy>=2.0.30
alembic>=1.13.2
openai>=1.40.0
PyPDF2>=3.0.1
python-docx>=1.1.2
python-dotenv>=1.0.1
httpx>=0.27.0
aiofiles>=24.1.0
jinja2>=3.1.4
pydantic>=2.8.2
PyJWT>=2.9.0
REQ

echo "🧹 Rebuilding AI venv..."
rm -rf venv
python3 -m venv venv
source venv/bin/activate

echo "📦 Installing AI deps..."
pip install --upgrade pip wheel setuptools
pip install -r requirements.txt

deactivate

echo "✅ AI ready."

restart_pm2_ai

pm2 save

echo ""
echo "======================================"
echo "✅ Deployment Finished Successfully!"
echo "======================================"

echo ""
echo "🌍 Checking services:"
echo "--------------------------------------"
sudo ss -lntp | grep -E "5000|8000|3000" || true
pm2 status
