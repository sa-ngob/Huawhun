# 🚀 Huawhun — คู่มือ Deploy บน Hostinger VPS

> VPS IP: `72.62.194.187`  
> Domain: `https://huawhun.aidev.business`  
> Project Path (VPS): `/root/Huawhun/`

---

## ✅ สิ่งที่ต้องมีก่อน Deploy ครั้งแรก

- [ ] Hostinger VPS พร้อมใช้งาน (Docker ติดตั้งแล้ว)
- [ ] Traefik รันอยู่แล้วจาก n8n stack (`n8n-traefik-1`)
- [ ] Domain ชี้มาที่ IP ของ VPS (DNS A Record)
- [ ] โค้ดอยู่บน VPS ที่ `/root/Huawhun/`

---

## 🛠️ Deploy ครั้งแรก (First-time Setup)

### ขั้นตอนที่ 1: SSH เข้า VPS
```bash
ssh root@72.62.194.187
```

### ขั้นตอนที่ 2: Clone หรือ Copy โค้ดขึ้น VPS
```bash
cd /root
git clone git@github.com:sa-ngob/Huawhun.git Huawhun
cd Huawhun
```

### ขั้นตอนที่ 3: ตรวจสอบ docker-compose.yml
ตรวจสอบว่ามี labels เหล่านี้ครบใน `app` service:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=n8n_default"
  - "traefik.http.routers.huawhun.rule=Host(`huawhun.aidev.business`)"
  - "traefik.http.routers.huawhun.entrypoints=web,websecure"
  - "traefik.http.routers.huawhun.tls=true"
  - "traefik.http.routers.huawhun.tls.certresolver=mytlschallenge"  ← สำคัญมาก!
  - "traefik.http.services.huawhun.loadbalancer.server.port=80"
```

### ขั้นตอนที่ 4: Build และ Start
```bash
cd /root/Huawhun
docker compose up --build -d
```

### ขั้นตอนที่ 5: ตรวจสอบสถานะ
```bash
docker ps | grep hanoi
```
ต้องเห็น `hanoi_lab_app` และ `hanoi_lab_db` สถานะ **Up**

### ขั้นตอนที่ 6: รอ SSL Cert (1-2 นาที)
```bash
# รอ ~1 นาที แล้วรัน
curl -vI https://huawhun.aidev.business 2>&1 | grep -E "issuer|subject|SSL"
```
ต้องเห็น `issuer: ... Let's Encrypt`

---

## 🔄 Deploy ครั้งถัดไป (Update Code)

```bash
ssh root@72.62.194.187
cd /root/Huawhun
git pull
docker compose up --build -d
```

**เสร็จในคำสั่งเดียว!** Traefik และ SSL ไม่ต้องตั้งค่าใหม่ครับ

---

## 🔍 Troubleshooting

### ปัญหา: `No services to build`
**สาเหตุ:** docker-compose.yml บน VPS ไม่มี `build:` section  
**แก้:** ตรวจสอบไฟล์บน VPS ด้วย `cat /root/Huawhun/docker-compose.yml`  
เทียบกับไฟล์ใน Git แล้วรัน `git pull` หรือเขียนไฟล์ใหม่ด้วย heredoc

### ปัญหา: App ไม่ขึ้น (Container = Created, ไม่ใช่ Up)
```bash
docker logs hanoi_lab_app
docker compose down && docker compose up --build -d
```

### ปัญหา: ERR_CERT_AUTHORITY_INVALID
**สาเหตุ:** Let's Encrypt ยังไม่ออก cert หรือ `certresolver` label หายไป  
**ตรวจสอบ:**
```bash
# ดูว่า certResolver อยู่ใน router หรือเปล่า
docker exec n8n-traefik-1 wget -qO- http://localhost:8080/api/http/routers/huawhun@docker 2>/dev/null | python3 -m json.tool | grep -A5 "tls"

# ถ้าไม่มี certResolver ให้เพิ่ม label แล้ว recreate
docker compose up -d --force-recreate app
```

### ปัญหา: Traefik ไม่เห็น Container
```bash
# ตรวจสอบ network
docker inspect hanoi_lab_app --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool

# App ต้องอยู่ใน n8n_default เหมือนกับ Traefik
```

---

## 📊 ตรวจสอบสถานะระบบ

```bash
# ดูทุก Container ที่รันอยู่
docker ps

# ดู log ของ App
docker logs hanoi_lab_app --tail 50

# ดู log ของ Database
docker logs hanoi_lab_db --tail 20

# ทดสอบ SSL cert
curl -vI https://huawhun.aidev.business 2>&1 | grep -E "issuer|SSL|subject"

# เช็คว่า cert ออกแล้วหรือยัง
docker exec n8n-traefik-1 cat /letsencrypt/acme.json | python3 -m json.tool | grep "main"
```

---

## 🏗️ Architecture Overview

```
Internet (HTTPS 443)
       │
       ▼
  [Traefik]  n8n-traefik-1
  Port 80 → redirect 443
  Port 443 → route by domain
       │
       │ huawhun.aidev.business
       ▼
  [nginx]  hanoi_lab_app
  React SPA (built by Vite)
       │
       │ Docker: hanoi_lab_network
       ▼
  [PostgreSQL]  hanoi_lab_db
  Internal only (ไม่เปิด port สาธารณะ)
```

---

## 🔑 Notes สำคัญ

1. **certresolver ต้องเป็น `mytlschallenge`** — ชื่อนี้ตรงกับ Traefik config ของ n8n
2. **App ต้องอยู่ใน network `n8n_default`** — เพื่อให้ Traefik เห็น Container
3. **nginx ต้อง `listen [::]:80;`** — Alpine ใช้ IPv6 สำหรับ localhost healthcheck
4. **ห้าม expose DB port** — ปลอดภัยกว่า ใช้ SSH Tunnel ถ้าต้องการเข้าถึง DB จากภายนอก
