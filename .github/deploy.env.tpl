# Vault: apps — subscribe-lists / DB / Server / githubaction-sshkey
SSH_PRIVATE_KEY=op://apps/githubaction-sshkey/private_key?ssh-format=openssh
HOST=op://apps/Server/host
USERNAME=op://apps/Server/username
SSH_PORT=op://apps/Server/ssh-port
TARGET_DIR=op://apps/subscribe-lists/target-dir
PORT=op://apps/subscribe-lists/port

DB_USER=op://apps/DB/db-user
DB_PASSWORD=op://apps/DB/db-password
DB_HOST=op://apps/DB/db-host
DB_PORT=op://apps/DB/db-port
DB_NAME=op://apps/subscribe-lists/db-name
MIGRATE_DB_USER=op://apps/DB/migrate-user
MIGRATE_DB_PASSWORD=op://apps/DB/migrate-password

AUTH_URL=op://apps/subscribe-lists/auth-url
AUTH_SECRET=op://apps/subscribe-lists/auth-secret
GOOGLE_CLIENT_ID=op://apps/subscribe-lists/google-client-id
GOOGLE_CLIENT_SECRET=op://apps/subscribe-lists/google-client-secret
ALLOWED_EMAIL=op://apps/subscribe-lists/allowed-email

SIGNALY_WEBHOOK_URL=op://apps/subscribe-lists/ci-webhook-url
SIGNALY_LOGIN_WEBHOOK_URL=op://apps/subscribe-lists/login-webhook-url
