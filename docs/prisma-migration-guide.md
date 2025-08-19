# Prisma Migration Guide

## 📚 목차
1. [개요](#개요)
2. [기본 명령어](#기본-명령어)
3. [개발 워크플로우](#개발-워크플로우)
4. [프로덕션 배포](#프로덕션-배포)
5. [일반적인 시나리오](#일반적인-시나리오)
6. [트러블슈팅](#트러블슈팅)

## 개요

Prisma Migrate는 데이터베이스 스키마를 버전 관리하고 동기화하는 도구입니다.

### 현재 프로젝트 설정
- **Database**: Supabase PostgreSQL
- **Connection**: 
  - `DATABASE_URL`: Pooled connection (for serverless)
  - `DIRECT_URL`: Direct connection (for migrations)

## 기본 명령어

### 1. 데이터베이스 초기화
```bash
# 처음 프로젝트를 설정할 때
npx prisma init
```

### 2. 마이그레이션 생성 및 적용
```bash
# 개발 환경에서 마이그레이션 생성 및 적용
npx prisma migrate dev --name <migration_name>

# 예시
npx prisma migrate dev --name add_user_table
npx prisma migrate dev --name add_email_unique_constraint
```

### 3. 마이그레이션 상태 확인
```bash
# 현재 마이그레이션 상태 확인
npx prisma migrate status
```

### 4. 프로덕션 마이그레이션 적용
```bash
# 프로덕션 환경에 마이그레이션 적용 (CI/CD에서 사용)
npx prisma migrate deploy
```

### 5. 데이터베이스 리셋
```bash
# 데이터베이스를 완전히 리셋하고 모든 마이그레이션 재적용
npx prisma migrate reset

# 확인 없이 강제 리셋 (주의!)
npx prisma migrate reset --force
```

## 개발 워크플로우

### 1. 스키마 변경하기

1. `prisma/schema.prisma` 파일 수정:
```prisma
// 예: 새로운 필드 추가
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  role      String   @default("USER")  // 새 필드 추가
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

2. 마이그레이션 생성:
```bash
npx prisma migrate dev --name add_user_role
```

3. Prisma Client 재생성:
```bash
npx prisma generate
```

### 2. 스키마와 데이터베이스 동기화

```bash
# 스키마 변경사항을 데이터베이스에 직접 반영 (마이그레이션 히스토리 없이)
# ⚠️ 개발 환경에서만 사용!
npx prisma db push
```

### 3. 데이터베이스에서 스키마 가져오기

```bash
# 기존 데이터베이스에서 스키마 생성 (reverse engineering)
npx prisma db pull
```

## 프로덕션 배포

### Vercel 배포 설정

1. `package.json`의 build 스크립트:
```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

2. `vercel.json` 설정:
```json
{
  "buildCommand": "prisma generate && next build"
}
```

### GitHub Actions CI/CD

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx prisma migrate deploy
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Build
        run: npm run build
```

## 일반적인 시나리오

### 1. 새 모델 추가

```prisma
// schema.prisma
model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  posts     Post[]   // 관계 추가
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```bash
npx prisma migrate dev --name add_post_model
```

### 2. 인덱스 추가

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([email, name])  // 복합 인덱스 추가
}
```

```bash
npx prisma migrate dev --name add_user_composite_index
```

### 3. 기본값 변경

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  isActive  Boolean  @default(true)  // 새 필드 with 기본값
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```bash
npx prisma migrate dev --name add_user_is_active
```

## 트러블슈팅

### 1. Migration 충돌 해결

```bash
# 로컬과 프로덕션 마이그레이션이 다를 때
npx prisma migrate resolve --applied "20240118123456_migration_name"

# 또는 특정 마이그레이션 롤백
npx prisma migrate resolve --rolled-back "20240118123456_migration_name"
```

### 2. 환경변수 문제

```bash
# .env 파일 확인
echo $DATABASE_URL
echo $DIRECT_URL

# Prisma 환경변수 테스트
npx prisma db push --preview-feature
```

### 3. Supabase 연결 문제

Supabase를 사용할 때는 두 가지 URL이 필요합니다:

```env
# .env
# Pooled connection - 앱에서 사용
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection - 마이그레이션에서 사용
DIRECT_URL="postgresql://...pooler.supabase.com:5432/postgres"
```

### 4. 긴급 롤백

```bash
# 마지막 마이그레이션 취소 (데이터 손실 주의!)
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script > rollback.sql

# SQL 직접 실행
psql $DATABASE_URL < rollback.sql
```

## 베스트 프랙티스

1. **항상 백업하기**: 프로덕션 마이그레이션 전 데이터베이스 백업
2. **스테이징 환경 테스트**: 프로덕션 적용 전 스테이징에서 테스트
3. **의미있는 마이그레이션 이름**: `add_user_email_index` 같은 명확한 이름 사용
4. **작은 단위로 마이그레이션**: 큰 변경사항은 여러 마이그레이션으로 분할
5. **팀과 동기화**: 마이그레이션 파일을 Git에 커밋하고 팀원과 공유

## 유용한 명령어 모음

```bash
# Prisma Studio 실행 (GUI 데이터베이스 뷰어)
npx prisma studio

# 스키마 검증
npx prisma validate

# 스키마 포맷팅
npx prisma format

# 데이터베이스 시드 실행
npx prisma db seed

# 마이그레이션 히스토리 보기
npx prisma migrate status

# SQL 미리보기 (실제 실행하지 않음)
npx prisma migrate dev --create-only
```

## 프로젝트별 스크립트

package.json에 추가하면 유용한 스크립트:

```json
{
  "scripts": {
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:reset": "prisma migrate reset",
    "db:studio": "prisma studio",
    "db:seed": "prisma db seed",
    "db:format": "prisma format",
    "db:validate": "prisma validate"
  }
}
```

## 참고 자료

- [Prisma Migrate 공식 문서](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Supabase with Prisma](https://supabase.com/docs/guides/integrations/prisma)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)