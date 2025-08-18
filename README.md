# Project TheSpikPan

Next.js + Vercel + Supabase + Prisma 풀스택 프로젝트

## 기술 스택

- **Frontend/Backend**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Authentication**: Supabase Auth

## 시작하기

### 1. 환경변수 설정

`.env.local` 파일을 생성하고 Supabase 프로젝트 정보를 입력하세요:

```bash
cp .env.example .env.local
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 설정

```bash
# Prisma 스키마를 데이터베이스에 푸시
npm run db:push

# 또는 마이그레이션 실행
npm run db:migrate
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 프로젝트 구조

```
.
├── app/              # Next.js App Router
├── components/       # React 컴포넌트
├── lib/             # 유틸리티 및 라이브러리
│   ├── supabase/    # Supabase 클라이언트
│   └── prisma.ts    # Prisma 클라이언트
├── prisma/          # Prisma 스키마 및 마이그레이션
├── middleware.ts    # Next.js 미들웨어 (인증)
└── utils/           # 유틸리티 함수
```

## 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run lint` - ESLint 실행
- `npm run db:push` - Prisma 스키마를 DB에 푸시
- `npm run db:migrate` - Prisma 마이그레이션 실행
- `npm run db:studio` - Prisma Studio 실행

## 배포

Vercel에 배포하려면:

1. Vercel에 프로젝트를 연결
2. 환경변수 설정
3. 배포

```bash
vercel
```
