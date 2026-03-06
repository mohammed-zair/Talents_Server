# PM2 AI Production Commands

Use these commands on production host to ensure AI runs without auto-reload.

```bash
cd /home/MZR/projects/job_gate/job_gate_ai

# Stop old process
pm2 delete job-gate-ai || true

# Start in production mode (NO --reload)
DEBUG=false pm2 start "python run.py" --name job-gate-ai --interpreter bash

# Alternative explicit uvicorn command (also no reload)
# DEBUG=false pm2 start "python -m uvicorn app.main:app --host 0.0.0.0 --port 8001" --name job-gate-ai --interpreter bash

pm2 save --force
pm2 logs job-gate-ai --lines 120
```

Expected behavior:
- No repeated `Started reloader process ...` lines.
- No frequent start/shutdown loop unless manual restart/deploy occurs.
