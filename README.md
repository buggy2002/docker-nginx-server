# Nginx Server with Docker

โปรเจกต์สำหรับจำลอง Server ด้วย Docker Compose ประกอบด้วย Nginx Gateway, Node.js API, Water Gate Frontend และ Cloudflare Tunnel

## Architecture

```text
Browser
   |
   v
Cloudflare Tunnel
   |
   v
Nginx Gateway :80
   |-- /open_api/ --> Water Gate Frontend :80
   `-- /          --> Node.js API :3000
```

ทุก Service อยู่ใน Docker network เดียวกันชื่อ `app_network` จึงเรียกหากันด้วยชื่อ Service ได้ เช่น `api-node:3000` และ `water-gate-frontend:80`

## Project structure

```text
.
├── docker-compose.yml
├── gateway/
│   └── nginx/conf.d/default.conf
└── services/
    ├── api-node/
    │   ├── Dockerfile
    │   ├── package.json
    │   └── server.js
    └── water-gate-frontend/
        ├── Dockerfile
        ├── nginx.conf
        ├── package.json
        └── vite.config.js
```

## Requirements

- Docker
- Docker Compose
- Internet connection สำหรับ Cloudflare Tunnel

ตรวจสอบการติดตั้ง:

```bash
docker --version
docker compose version
```

## Run locally

รันจากโฟลเดอร์ที่มี `docker-compose.yml`:

```bash
docker compose up -d --build
```

ตรวจสอบสถานะ:

```bash
docker compose ps
```

เปิดระบบในเครื่อง:

```text
http://localhost:8080/
http://localhost:8080/open_api/
```

ทดสอบด้วยคำสั่ง:

```bash
curl -i http://localhost:8080/
curl -i http://localhost:8080/open_api/
```

## Nginx routing

ไฟล์ Config อยู่ที่ `gateway/nginx/conf.d/default.conf`

```text
/open_api/  -> water-gate-frontend:80
/           -> api-node:3000
```

เมื่อแก้ Nginx Config ให้ตรวจสอบและ Restart:

```bash
docker compose exec nginx nginx -t
docker compose restart nginx
```

## Water Gate Frontend

Frontend ใช้ Vite และตั้ง Base Path เป็น:

```js
base: '/open_api/'
```

ดังนั้น URL ต้องใช้ `/open_api/` และ Nginx ภายใน Frontend มี SPA fallback ไปที่ `/open_api/index.html` เพื่อรองรับ Vue Router เช่น `/open_api/login`

ถ้าแก้ Source Code หรือ Vite Config ให้ Build ใหม่:

```bash
docker compose up -d --build water-gate-frontend
```

## Cloudflare Tunnel

ปัจจุบัน Compose ใช้ Quick Tunnel:

```yaml
command: tunnel --url http://nginx:80
```

ดู URL ที่ Cloudflare สร้างให้:

```bash
docker compose logs -f cloudflared
```

จะเห็น URL ลักษณะนี้:

```text
https://random-name.trycloudflare.com
```

Quick Tunnel เหมาะสำหรับทดสอบเท่านั้น URL อาจเปลี่ยนเมื่อ Container ถูกสร้างใหม่ และต้องปล่อย Container ให้ทำงานอยู่ตลอดเวลา

### Named Tunnel สำหรับใช้งานต่อเนื่อง

ถ้ามี Domain และสร้าง Tunnel ใน Cloudflare Dashboard แล้ว ให้ใส่ Token ในไฟล์ `.env`:

```env
CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token
```

จากนั้นเปลี่ยนคำสั่งใน `docker-compose.yml` เป็น:

```yaml
command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
```

ใน Cloudflare Dashboard ตั้ง Published Application ให้ชี้ไปที่:

```text
http://nginx:80
```

ห้าม Commit ไฟล์ `.env` หรือเปิดเผย Tunnel Token

## Common commands

ดู Log ทั้งหมด:

```bash
docker compose logs -f
```

ดู Log เฉพาะ Service:

```bash
docker compose logs -f nginx
docker compose logs -f api-node
docker compose logs -f water-gate-frontend
docker compose logs -f cloudflared
```

Restart Service:

```bash
docker compose restart nginx
docker compose restart cloudflared
```

หยุดระบบ:

```bash
docker compose down
```

Rebuild ใหม่ทั้งหมด:

```bash
docker compose down
docker compose up -d --build
```

## Deploy หลัง Pull Code

บน Server ให้ทำตามลำดับ:

```bash
git pull --rebase origin main
docker compose up -d --build
docker compose ps
```

ถ้าแก้เฉพาะ Nginx Config ไม่จำเป็นต้อง Build Image ใหม่:

```bash
docker compose exec nginx nginx -t
docker compose restart nginx
```

ถ้าแก้ Frontend หรือ Dockerfile ให้ Build ใหม่เฉพาะ Service:

```bash
docker compose up -d --build water-gate-frontend
```

## Troubleshooting

### Nginx ขึ้น 502

ตรวจสอบว่า Service ทำงาน:

```bash
docker compose ps
docker compose logs --tail=100 nginx
docker compose logs --tail=100 api-node
```

ตรวจสอบการติดต่อภายใน Network:

```bash
docker run --rm --network nginx-server_app_network curlimages/curl:latest -i http://api-node:3000
docker run --rm --network nginx-server_app_network curlimages/curl:latest -i http://water-gate-frontend:80/open_api/
```

### Frontend เปิดได้แต่ Refresh แล้ว 404

ตรวจสอบให้มีทั้งสามส่วนนี้ตรงกัน:

```text
Vite base:       /open_api/
Gateway Nginx:   /open_api/
Frontend Nginx:  /open_api/
```

จากนั้น Build Frontend ใหม่

### Cloudflare Tunnel เข้าไม่ได้

ตรวจสอบ:

```bash
docker compose ps cloudflared
docker compose logs --tail=100 cloudflared
```

สำหรับ Docker Origin ต้องใช้:

```text
http://nginx:80
```

ไม่ใช้ `localhost:8080` จากภายใน `cloudflared` Container
