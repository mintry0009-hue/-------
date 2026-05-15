# Vercel + Supabase 전환 가이드

이 문서는 현재 로컬용 `Node + SQLite` 프로젝트를 `Vercel + Supabase` 구조로 옮기기 위한 기준 문서입니다.

## 목표 구조

- 프론트엔드: Vercel 정적 배포
- API: Vercel Functions
- DB: Supabase Postgres
- 인증: 1차는 기존 JWT 유지 가능, 2차는 Supabase Auth 권장
- 푸시 구독 저장: Supabase
- 푸시 발송: 공지 생성 API에서 `web-push` 실행

## 권장 전환 순서

1. Supabase 프로젝트 생성
2. `supabase/schema.sql` 실행
3. Vercel 프로젝트 생성
4. 환경변수 등록
5. 프론트를 `frontend/`에서 정적 파일로 배포
6. API를 `api/` Vercel Functions로 전환
7. SQLite 코드 제거
8. 선택: 인증을 Supabase Auth로 교체

## Supabase에서 먼저 만들 것

SQL Editor에서 [supabase/schema.sql](C:/Users/USER/Desktop/푸른여행알리미/supabase/schema.sql)을 실행합니다.

## Vercel 환경변수

프로젝트에 아래 값을 등록합니다.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

예시는 [api/.env.example](C:/Users/USER/Desktop/푸른여행알리미/api/.env.example)에 있습니다.

## API 전환 우선순위

### 현재 이식된 함수

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/bootstrap`
- `GET /api/classes`
- `POST /api/classes`
- `POST /api/classes/join`
- `GET /api/classes/[classId]`
- `POST /api/classes/[classId]/groups`
- `POST /api/classes/[classId]/assign`
- `GET /api/classes/[classId]/notices`
- `POST /api/classes/[classId]/notices`
- `GET /api/my/notices`
- `GET /api/push/public-key`
- `POST /api/push/subscribe`

## 인증 전략

### 빠른 전환

- 지금처럼 `users` 테이블 + `JWT_SECRET` 유지
- 장점: 기존 프론트 수정이 적음
- 단점: 장기적으로는 Auth 기능을 직접 관리해야 함

### 권장 장기안

- Supabase Auth 사용
- 사용자 프로필은 `profiles` 테이블로 분리
- 프론트는 `supabase-js`로 세션 관리

## 푸시 알림 관련

- Vercel은 HTTPS가 기본 제공되므로 브라우저 푸시 조건에 유리합니다.
- 다만 Vercel Functions는 호출형이므로, “공지 생성 시 발송” 방식으로 유지하는 것이 가장 단순합니다.
- 대량 발송이 필요해지면 큐나 비동기 작업으로 분리하는 것이 좋습니다.

## 프론트 전환 포인트

- 현재 프론트는 `/api` 경로를 사용 중이므로, Vercel에서도 같은 경로를 유지하면 코드 변경이 적습니다.
- 지금은 `frontend/server.js`가 프록시를 담당하지만, Vercel 배포 후에는 필요 없습니다.

## 남은 큰 작업

- 프론트 정적 자산을 Vercel 배포 구조로 정리
- 실제 Vercel 프로젝트와 Supabase 환경변수 연결
- 선택: Supabase Auth 전환
