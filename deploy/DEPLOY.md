# Nestar API — VPS deploy (nginx + systemd + PostgreSQL)

G'oya: NestJS `127.0.0.1:3002` da, **PostgreSQL** `127.0.0.1:5432` da ishlaydi,
**nginx** tashqaridan (80/443) qabul qilib proxy qiladi.

```
Brauzer → https://nestar-web.vercel.app/api/*  (Vercel rewrite)
              ↓
         VPS: nginx :80/:443  →  127.0.0.1:3002 (NestJS, NODE_ENV=production)
              ↓
         PostgreSQL :5432  (localhost, system dasturi)
```

## 1. Server tayyorlash (Ubuntu/Debian)

```bash
sudo apt update && sudo apt install -y git nginx postgresql postgresql-contrib

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20+
```

## 2. PostgreSQL bazasini tayyorlash

```bash
sudo -u postgres psql
  CREATE USER nestar WITH PASSWORD 'KuchliParol123!';
  CREATE DATABASE nestar OWNER nestar;
  \q
```

## 3. Kodni olish va build qilish

```bash
sudo mkdir -p /var/www/nestar-nestjs && sudo chown $USER /var/www/nestar-nestjs
git clone https://github.com/Hasanboy1295/nestar-nestjs.git /var/www/nestar-nestjs
cd /var/www/nestar-nestjs
npm ci
npm run build
```

## 4. `.env` (serverda)

```bash
cp .env.example /var/www/nestar-nestjs/.env
nano /var/www/nestar-nestjs/.env
#  DATABASE_URL=postgres://nestar:KuchliParol123!@127.0.0.1:5432/nestar
#  SECRET_TOKEN=<haqiqiy qiymat>
#  ALLOWED_ORIGINS=https://nestar-web.vercel.app
chmod 600 /var/www/nestar-nestjs/.env
```

## 5. Ma'lumotni ko'chirish (MongoDB → PostgreSQL)

```bash
cd /var/www/nestar-nestjs
node --env-file=.env scripts/migrate.mjs   # members + listings import
```

`MONGO_DEV` / `MONGO_PROD` `.env` da ko'rsatilishi kerak. `NODE_ENV=production`
bo'lsa skript `MONGO_PROD` ni manba deb oladi.

## 6. systemd service

```bash
sudo cp deploy/nestar-api.service /etc/systemd/system/nestar-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now nestar-api
systemctl status nestar-api        # active (running) bo'lishi kerak
curl -s http://127.0.0.1:3002/api/health
```

Kod yangilaganda:

```bash
cd /var/www/nestar-nestjs && git pull && npm ci && npm run build
sudo systemctl restart nestar-api
```

## 7. nginx

```bash
sudo cp deploy/nginx-nestar.conf /etc/nginx/sites-available/nestar-api
# server_name ni haqiqiy domen/IP ga o'zgartiring
sudo ln -s /etc/nginx/sites-available/nestar-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Test: `curl -s http://<server-ip>/api/health` → `{ok:true,...}`

## 8. HTTPS (domen bo'lsa)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.uz
```

## 9. Frontend'ni ulash (Vercel)

`nestar-web` → Settings → Environment Variables:

- `API_URL` = `http://<server-ip>:3002` (yoki `https://api.your-domain.uz`)
- Redeploy qiling.

> Eslatma: API'ning `ALLOWED_ORIGINS` qiymatiga frontend manzilini qo'shing
> (`https://nestar-web.vercel.app`). Cookie `secure` bo'lgani uchun auth'ni
> to'g'ridan-to'g'ri `http://ip:3002` orqali emas, frontend proxysi orqali ishlating.