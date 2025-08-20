# 더식판 (TheSikpan) - Restaurant Management SaaS Platform

식당 운영자를 위한 종합 관리 플랫폼

## 🏗 아키텍처

- **Frontend**: Next.js 15 (App Router)
- **Backend**: Django 5.2 + Django REST Framework
- **Database**: PostgreSQL (개발: SQLite, 운영: AWS RDS)
- **Cache/Queue**: Redis + Celery
- **Payment**: NICEPAY CMS Integration
- **Deployment**: Docker + AWS ECS + Terraform

## 📁 프로젝트 구조

```
project-thespikpan/
├── app/                    # Next.js Frontend
│   ├── nicepay/           # NICEPAY 관리 UI
│   └── api/mock/          # Mock API (개발용)
├── backend/               # Django Backend
│   ├── thesikpan/        # Django 프로젝트 설정
│   ├── core/             # 공통 기능
│   ├── accounts/         # 사용자 인증/권한
│   ├── restaurants/      # 식당 관리
│   └── payments/         # 결제/정산 (NICEPAY)
├── terraform/            # Infrastructure as Code
└── docs/                # 문서

```

## 🚀 시작하기

### Frontend (Next.js)

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# http://localhost:3000
```

### Backend (Django)

```bash
# Python 가상환경 설정
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env

# DB 마이그레이션
python manage.py migrate

# 슈퍼유저 생성
python manage.py createsuperuser

# 개발 서버 실행
python manage.py runserver

# http://localhost:8000
```

### Docker (All-in-One)

```bash
# 빌드 및 실행
docker-compose up --build

# Django: http://localhost:8000
# Next.js: http://localhost:3000
```

## 🔑 주요 기능

### 1. 식당 관리
- 메뉴 관리
- 영업시간 설정
- 좌석/예약 관리

### 2. 주문/결제
- 온라인 주문 시스템
- POS 연동
- QR 주문

### 3. 정산 자동화 (NICEPAY)
- 자동 정산
- 정산 내역 관리
- 증빙 서류 관리

### 4. 고객 관리
- CRM
- 리뷰 관리
- 마케팅 자동화

### 5. 분석 대시보드
- 매출 분석
- 고객 분석
- 메뉴 분석

## 📝 API 문서

- Django Admin: http://localhost:8000/admin
- API Docs: http://localhost:8000/api/docs
- Mock API: http://localhost:3000/api/mock

## 🔧 환경 변수

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///db.sqlite3
REDIS_URL=redis://localhost:6379
NICEPAY_SERVICE_ID=your-service-id
NICEPAY_API_KEY=your-api-key
```

## 📦 배포

### Vercel (Frontend)
```bash
vercel
```

### AWS ECS (Backend)
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## 📚 문서

- [아키텍처 설계](backend/docs/ARCHITECTURE.md)
- [NICEPAY 연동 가이드](docs/NICEPAY_UI_GUIDE.md)
- [API 명세서](docs/API_SPEC.md)

## 🤝 기여

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 라이선스

Copyright © 2024 TheSikpan. All rights reserved.