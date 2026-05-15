# 푸른여행 알리미

수학여행에서 사용할 반/조 단위 공지 웹서비스입니다.

## 구조

- `backend`: Express + SQLite API 서버
- `frontend`: 정적 프론트엔드 + Node 프록시 서버

## 주요 기능

- 회원가입 / 로그인
- 선생님 / 학생 계정 구분
- 반 생성 및 참여 코드 발급
- 조 생성
- 학생 조 배정
- 공지 작성
- 학생 반 참여
- 학생 웹 푸시 구독

## 로컬 실행

### 1. 백엔드

```powershell
cd C:\Users\USER\Desktop\푸른여행알리미\backend
npm.cmd install --cache .npm-cache
node src/server.js
```

기본 주소: `http://127.0.0.1:4000`

### 2. 프론트엔드

```powershell
cd C:\Users\USER\Desktop\푸른여행알리미\frontend
node server.js
```

기본 주소: `http://127.0.0.1:5173`

## 로컬 개발에서 사용할 주소

- 프론트엔드: `http://127.0.0.1:5173`
- 백엔드 상태 확인: `http://127.0.0.1:5173/api/health`
- 프론트가 `/api` 요청을 백엔드 `127.0.0.1:4000`으로 프록시합니다.

## 보조 스크립트

- [run-backend.ps1](C:/Users/USER/Desktop/푸른여행알리미/run-backend.ps1)
- [run-frontend.ps1](C:/Users/USER/Desktop/푸른여행알리미/run-frontend.ps1)
- [run-cloudflare-tunnel.ps1](C:/Users/USER/Desktop/푸른여행알리미/run-cloudflare-tunnel.ps1)

## Vercel + Supabase 전환 자료

- 전환 가이드: [docs/deployment/vercel-supabase-migration.md](C:/Users/USER/Desktop/푸른여행알리미/docs/deployment/vercel-supabase-migration.md)
- 배포 체크리스트: [docs/deployment/vercel-supabase-checklist.md](C:/Users/USER/Desktop/푸른여행알리미/docs/deployment/vercel-supabase-checklist.md)
- Supabase 스키마: [supabase/schema.sql](C:/Users/USER/Desktop/푸른여행알리미/supabase/schema.sql)
- Vercel API 골격: [api](C:/Users/USER/Desktop/푸른여행알리미/api)
- Vercel 설정: [vercel.json](C:/Users/USER/Desktop/푸른여행알리미/vercel.json)

## API 개요

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/bootstrap`
- `GET /api/classes`
- `POST /api/classes`
- `POST /api/classes/join`
- `GET /api/classes/:classId`
- `POST /api/classes/:classId/groups`
- `POST /api/classes/:classId/assign`
- `GET /api/classes/:classId/notices`
- `POST /api/classes/:classId/notices`
- `GET /api/my/notices`
- `GET /api/push/public-key`
- `POST /api/push/subscribe`
