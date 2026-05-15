# Vercel + Supabase 배포 체크리스트

## 1. Supabase 준비

1. Supabase에서 새 프로젝트를 만든다.
2. SQL Editor에서 [supabase/schema.sql](C:/Users/USER/Desktop/푸른여행알리미/supabase/schema.sql)을 실행한다.
3. `Project Settings > API`에서 아래 값을 확인한다.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2. VAPID 키 준비

웹 푸시를 실제 배포에서 쓰려면 고정된 VAPID 키가 필요하다.

필요한 환경변수:

- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## 3. Vercel 프로젝트 생성

1. 이 저장소를 GitHub에 올린다.
2. Vercel에서 `New Project`로 해당 저장소를 가져온다.
3. Framework Preset은 `Other`로 둬도 된다.

## 4. Vercel 환경변수 등록

아래 값을 등록한다.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

예시는 [api/.env.example](C:/Users/USER/Desktop/푸른여행알리미/api/.env.example)에 있다.

## 5. 배포 구조 확인

현재 설정은 아래처럼 동작한다.

- `/` -> [frontend/index.html](C:/Users/USER/Desktop/푸른여행알리미/frontend/index.html)
- `/app.js` -> [frontend/app.js](C:/Users/USER/Desktop/푸른여행알리미/frontend/app.js)
- `/styles.css` -> [frontend/styles.css](C:/Users/USER/Desktop/푸른여행알리미/frontend/styles.css)
- `/sw.js` -> [frontend/sw.js](C:/Users/USER/Desktop/푸른여행알리미/frontend/sw.js)
- `/api/*` -> [api](C:/Users/USER/Desktop/푸른여행알리미/api) 아래 Vercel Functions

## 6. 배포 후 확인

1. `/api/health`가 `{"ok":true}`를 반환하는지 확인
2. 회원가입 / 로그인 확인
3. 선생님 계정으로 반 생성 확인
4. 학생 계정으로 반 참여 확인
5. 학생 계정에서 푸시 구독 확인
6. 선생님 공지 등록 시 푸시 도착 확인

## 7. 주의사항

- 현재 인증은 Supabase Auth가 아니라 자체 JWT 방식이다.
- 장기적으로는 `users` 테이블 기반 로그인보다 Supabase Auth 전환이 더 좋다.
- 푸시 발송은 현재 함수 요청 안에서 바로 처리하므로 대량 발송에는 적합하지 않다.
