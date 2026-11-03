"""
Gunicorn configuration for Zyro AI v1.6.5
Production-ready WSGI server settings
"""

import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '5004')}"
backlog = 2048

# Worker processes
# Recommended: (2 x CPU cores) + 1 for I/O bound apps
workers = int(os.getenv('WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = os.getenv('WORKER_CLASS', 'sync')  # sync, gevent, eventlet
worker_connections = 1000
threads = int(os.getenv('THREADS', 1))
max_requests = 1000  # Restart workers after this many requests (memory leak prevention)
max_requests_jitter = 50  # Add randomness to prevent all workers restarting at once

# Timeouts
timeout = 180  # Worker timeout in seconds
graceful_timeout = 30  # Time to wait for workers to finish requests
keepalive = 5  # Seconds to keep client connections alive
keepalive_expires = 30

# Security
limit_request_line = 4096  # Max size of request line
limit_request_fields = 100  # Max number of headers
limit_request_field_size = 8190  # Max size of each header

# Process naming
proc_name = 'zyro-ai'

# Logging
accesslog = os.getenv('ACCESS_LOG', '-')  # '-' for stdout, path for file
errorlog = os.getenv('ERROR_LOG', '-')
loglevel = os.getenv('LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# PID file
pidfile = os.getenv('PID_FILE', None)

# Daemon mode (set via env for production)
daemon = os.getenv('DAEMON', 'false').lower() == 'true'

# User/Group (run as non-root in production)
# user = os.getenv('GUNICORN_USER', 'www-data')
# group = os.getenv('GUNICORN_GROUP', 'www-data')

# SSL (if terminating TLS at Gunicorn)
# keyfile = os.getenv('SSL_KEY', None)
# certfile = os.getenv('SSL_CERT', None)
# ssl_version = 'TLS'
# cert_reqs = 0  # No client cert required
# ca_certs = None

# Pre-fork hook
def on_starting(server):
    server.log.info("Zyro AI starting...")

def when_ready(server):
    server.log.info(f"Zyro AI ready. Listening on: {bind}")

def on_exit(server):
    server.log.info("Zyro AI shutting down...")

# Post-fork hook - called in each worker after fork
def post_fork(server, worker):
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def pre_exit(server):
    server.log.info("Received shutdown signal")