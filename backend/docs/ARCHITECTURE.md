# 더식판(TheSikpan) SaaS Architecture

## 프로젝트 개요
더식판은 식당 운영자를 위한 종합 SaaS 플랫폼입니다.

## 주요 기능
1. **식당 관리**: 메뉴, 영업시간, 좌석 관리
2. **주문 관리**: 온라인 주문, POS 연동
3. **정산 관리**: NICEPAY 연동 자동 정산
4. **고객 관리**: CRM, 리뷰, 마케팅
5. **분석 대시보드**: 매출 분석, 고객 분석

## Django Apps 구조
```
thesikpan/
├── core/           # 공통 기능, 유틸리티
├── accounts/       # 사용자 인증, 권한 관리
├── restaurants/    # 식당 관리
├── payments/       # 결제/정산 (NICEPAY 연동)
├── orders/         # 주문 관리 (TODO)
├── analytics/      # 분석/리포트 (TODO)
└── marketing/      # 마케팅 자동화 (TODO)
```

## 기술 스택
- **Backend**: Django 5.2 + DRF
- **Frontend**: Next.js 15
- **Database**: PostgreSQL (AWS RDS)
- **Cache**: Redis (로컬 개발 시 SQLite 메모리)
- **Queue**: Celery + Redis
- **Payment**: NICEPAY CMS API
- **Deployment**: Docker + AWS ECS

## TODO: 향후 확장 시 분리 아키텍처
```yaml
# 현재: 단일 ECS Task (All-in-One)
ECS_Task_1:
  - Django API Server
  - Celery Worker
  - Celery Beat
  
# 향후: 마이크로서비스 분리
ECS_Service_API:
  - Django API (2+ tasks)
  - Auto Scaling
  
ECS_Service_Worker:
  - Celery Worker (2+ tasks)
  - SQS/ElastiCache 연동
  
ECS_Service_Scheduler:
  - Celery Beat (1 task)
  - 중복 실행 방지
  
ElastiCache:
  - Redis Cluster
  - Session Store
  - Cache Layer
  
RDS:
  - PostgreSQL Multi-AZ
  - Read Replica
```

## 환경 변수 관리
- 개발: .env 파일
- 운영: AWS Systems Manager Parameter Store

## API 엔드포인트 규칙
```
/api/v1/auth/         # 인증
/api/v1/restaurants/  # 식당 관리
/api/v1/orders/       # 주문
/api/v1/payments/     # 결제/정산
/api/v1/analytics/    # 분석
```