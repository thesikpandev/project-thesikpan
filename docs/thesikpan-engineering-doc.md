# 더식판 서비스 Engineering Design Document

## 1. System Architecture Overview

### 1.1 Tech Stack
```yaml
Backend:
  - Framework: FastAPI (async 지원, 고성능)
  - ORM: SQLModel (Pydantic + SQLAlchemy 통합)
  - Database: PostgreSQL (Supabase/Neon)
  - Cache: Redis (Upstash)
  - Queue: Celery + Redis (스케줄링, 배치 작업)
  
Frontend:
  - Framework: Next.js 14 (App Router)
  - UI: Shadcn/UI + Tailwind CSS
  - State: Zustand + React Query
  - Forms: React Hook Form + Zod
  
Infrastructure:
  - Hosting: Vercel (Frontend) + Railway/Render (Backend)
  - Storage: Supabase Storage (파일 업로드)
  - Monitoring: Sentry + Vercel Analytics
  - CI/CD: GitHub Actions
```

### 1.2 Architecture Diagram
```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  본사    │ │  센터    │ │ 교육기관 │ │  학부모  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  API Gateway (FastAPI)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │     Authentication & Authorization (JWT)          │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│  │   Auth   │ │  Member  │ │  Payment │ │  Admin  │  │
│  │   API    │ │   API    │ │    API   │ │   API   │  │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘  │
└────────┬──────────────┬──────────────┬─────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  PostgreSQL │ │    Redis    │ │   Celery    │
│  (Supabase) │ │  (Upstash)  │ │   Worker    │
└─────────────┘ └─────────────┘ └──────┬──────┘
                                        │
                                        ▼
                              ┌─────────────────┐
                              │  Nice Pay API   │
                              │   (External)    │
                              └─────────────────┘
```

## 2. Database Design

### 2.1 Schema Design Principles
- **정규화**: 3NF 준수, 중복 최소화
- **인덱싱**: 자주 조회되는 컬럼에 인덱스 설정
- **파티셔닝**: payments 테이블 월별 파티션 고려
- **Soft Delete**: 중요 데이터는 실제 삭제 대신 is_active 플래그 사용

### 2.2 Key Tables & Relationships
```sql
-- 핵심 관계
Users (1) ─── (1) Parent
Parent (1) ─── (N) Child
Parent (1) ─── (N) Payment
Parent (1) ─── (1) CMSInfo
Organization (1) ─── (N) Organization (계층구조)
Organization (1) ─── (N) Settlement
```

### 2.3 Performance Optimization
```python
# 자주 사용되는 쿼리 최적화 예시

# 1. 미납자 조회 (색상 구분)
async def get_overdue_members(db: Session):
    return db.exec(
        select(Parent, Payment)
        .join(Payment)
        .where(
            Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.FAILED]),
            Payment.payment_month == current_month
        )
        .options(selectinload(Parent.children))
    ).all()

# 2. 일별 출금 대상자
async def get_daily_payment_targets(payment_day: int):
    return db.exec(
        select(CMSInfo)
        .where(
            CMSInfo.payment_day == payment_day,
            CMSInfo.cms_status == CMSStatus.ACTIVE
        )
        .options(selectinload(CMSInfo.parent))
    ).all()
```

## 3. API Design

### 3.1 RESTful API Structure
```python
# API 라우트 구조
/api/v1/
├── auth/
│   ├── login
│   ├── logout
│   └── refresh
├── members/
│   ├── parents/
│   └── children/
├── payments/
│   ├── cms/
│   ├── transactions/
│   └── settlements/
├── organizations/
│   ├── centers/
│   └── institutions/
└── admin/
    ├── dashboard/
    └── reports/
```

### 3.2 API Security
```python
# JWT 인증 + 역할 기반 접근 제어
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

def get_current_user(token: str = Depends(security)):
    # JWT 토큰 검증
    payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=["HS256"])
    return payload

def require_role(*roles: UserRole):
    def role_checker(current_user = Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=403, detail="권한이 없습니다")
        return current_user
    return role_checker

# 사용 예시
@router.get("/admin/dashboard")
async def admin_dashboard(
    user = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.REGIONAL_ADMIN))
):
    return {"message": "Admin Dashboard"}
```

## 4. Nice Pay Integration

### 4.1 API Integration Pattern
```python
class NicePayService:
    """나이스페이 API 서비스"""
    
    def __init__(self):
        self.base_url = settings.NICEPAY_BASE_URL
        self.api_key = settings.NICEPAY_API_KEY
        self.retry_policy = RetryPolicy(max_attempts=3, backoff=2)
    
    async def register_member(self, member_data: CMSMemberData) -> NicePayResponse:
        """회원 등록 (with retry)"""
        @retry(policy=self.retry_policy)
        async def _request():
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/members/{member_data.member_id}",
                    headers={"Api-Key": self.api_key},
                    json=member_data.dict()
                )
                return NicePayResponse(**response.json())
        
        return await _request()
    
    async def process_payment(self, payment_data: PaymentData) -> PaymentResult:
        """출금 요청"""
        # 1. 출금 요청
        result = await self._request_payment(payment_data)
        
        # 2. DB 저장
        await self._save_payment_log(result)
        
        # 3. Polling 작업 예약
        schedule_polling_task.delay(
            payment_id=result.payment_id,
            check_after=datetime.now() + timedelta(days=1)
        )
        
        return result
```

### 4.2 Polling System Design
```python
# Celery Tasks for Polling
from celery import Celery
from datetime import datetime, timedelta

app = Celery('thesikpan', broker=REDIS_URL)

@app.task(bind=True, max_retries=5)
def poll_payment_status(self, payment_id: int):
    """결제 상태 Polling"""
    try:
        # 1. Nice Pay API 호출
        status = nicepay_service.get_payment_status(payment_id)
        
        # 2. 상태 업데이트
        update_payment_status(payment_id, status)
        
        # 3. 상태에 따른 처리
        if status == "PENDING":
            # 5분 후 재시도
            raise self.retry(countdown=300)
        elif status == "FAILED":
            # 미납 처리
            handle_payment_failure(payment_id)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)

# Celery Beat Schedule (정기 작업)
app.conf.beat_schedule = {
    'daily-payment-processing': {
        'task': 'tasks.process_daily_payments',
        'schedule': crontab(hour=10, minute=0),  # 매일 오전 10시
    },
    'check-pending-payments': {
        'task': 'tasks.check_pending_payments',
        'schedule': timedelta(minutes=5),  # 5분마다
    },
}
```

## 5. Frontend Architecture

### 5.1 Next.js App Structure
```typescript
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── layout.tsx         # 대시보드 레이아웃
│   ├── page.tsx          # 역할별 대시보드
│   ├── members/
│   ├── payments/
│   └── settings/
├── (parent)/
│   ├── layout.tsx        # 학부모 전용 레이아웃
│   ├── page.tsx         # 결제 상태 확인
│   └── history/
├── api/
│   └── [...nextapi]/    # API 프록시
└── components/
    ├── ui/              # Shadcn 컴포넌트
    └── features/        # 비즈니스 컴포넌트
```

### 5.2 State Management
```typescript
// Zustand Store 예시
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface PaymentStore {
  payments: Payment[]
  overdueCount: number
  fetchPayments: () => Promise<void>
  updatePaymentStatus: (id: string, status: PaymentStatus) => void
}

export const usePaymentStore = create<PaymentStore>()(
  devtools(
    persist(
      (set, get) => ({
        payments: [],
        overdueCount: 0,
        
        fetchPayments: async () => {
          const data = await api.getPayments()
          set({ 
            payments: data,
            overdueCount: data.filter(p => p.status === 'overdue').length
          })
        },
        
        updatePaymentStatus: (id, status) => {
          set(state => ({
            payments: state.payments.map(p => 
              p.id === id ? { ...p, status } : p
            )
          }))
        }
      }),
      { name: 'payment-store' }
    )
  )
)
```

## 6. Security Considerations

### 6.1 Authentication & Authorization
```python
# Multi-factor Authentication for Admin
class MFAService:
    async def generate_otp(self, user_id: int) -> str:
        """TOTP 생성"""
        secret = pyotp.random_base32()
        await redis.setex(f"mfa:{user_id}", 300, secret)
        return pyotp.TOTP(secret).now()
    
    async def verify_otp(self, user_id: int, otp: str) -> bool:
        """OTP 검증"""
        secret = await redis.get(f"mfa:{user_id}")
        if not secret:
            return False
        return pyotp.TOTP(secret).verify(otp, valid_window=1)
```

### 6.2 Data Encryption
```python
# 민감 정보 암호화
from cryptography.fernet import Fernet

class EncryptionService:
    def __init__(self):
        self.cipher = Fernet(settings.ENCRYPTION_KEY)
    
    def encrypt_account_number(self, account: str) -> str:
        """계좌번호 암호화"""
        return self.cipher.encrypt(account.encode()).decode()
    
    def decrypt_account_number(self, encrypted: str) -> str:
        """계좌번호 복호화"""
        return self.cipher.decrypt(encrypted.encode()).decode()
    
    def mask_account_number(self, account: str) -> str:
        """계좌번호 마스킹"""
        if len(account) <= 4:
            return "****"
        return f"****{account[-4:]}"
```

## 7. Performance Optimization

### 7.1 Caching Strategy
```python
# Redis 캐싱
class CacheService:
    def __init__(self):
        self.redis = redis.from_url(REDIS_URL)
    
    async def get_or_set(self, key: str, func, ttl: int = 300):
        """Cache-aside pattern"""
        # 1. 캐시 확인
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        
        # 2. DB 조회
        result = await func()
        
        # 3. 캐시 저장
        await self.redis.setex(
            key, ttl, json.dumps(result, default=str)
        )
        return result

# 사용 예시
@router.get("/dashboard/stats")
async def get_dashboard_stats(
    organization_id: int,
    cache: CacheService = Depends()
):
    return await cache.get_or_set(
        f"dashboard:{organization_id}",
        lambda: calculate_dashboard_stats(organization_id),
        ttl=600  # 10분 캐시
    )
```

### 7.2 Database Query Optimization
```python
# N+1 문제 해결
from sqlmodel import select
from sqlalchemy.orm import selectinload

async def get_parents_with_children(db: Session):
    """부모와 자녀 정보 한번에 조회"""
    query = (
        select(Parent)
        .options(
            selectinload(Parent.children),
            selectinload(Parent.cms_info),
            selectinload(Parent.payments)
        )
        .where(Parent.service_status == ServiceStatus.ACTIVE)
    )
    return db.exec(query).all()
```

## 8. Monitoring & Logging

### 8.1 Structured Logging
```python
import structlog

logger = structlog.get_logger()

class LoggingMiddleware:
    async def __call__(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        
        with logger.contextvars(
            request_id=request_id,
            path=request.url.path,
            method=request.method
        ):
            start_time = time.time()
            response = await call_next(request)
            process_time = time.time() - start_time
            
            logger.info(
                "request_processed",
                status_code=response.status_code,
                process_time=process_time
            )
            
            return response
```

### 8.2 Health Checks
```python
@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    checks = {
        "database": await check_database(db),
        "redis": await check_redis(),
        "nicepay": await check_nicepay_api(),
    }
    
    status = "healthy" if all(checks.values()) else "unhealthy"
    status_code = 200 if status == "healthy" else 503
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

## 9. Deployment Strategy

### 9.1 Environment Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NICEPAY_API_KEY=${NICEPAY_API_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=thesikpan
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=${DB_PASSWORD}
  
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
  
  celery:
    build: ./backend
    command: celery -A app.celery worker --loglevel=info
    depends_on:
      - redis
      - postgres

volumes:
  postgres_data:
  redis_data:
```

### 9.2 CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          pip install -r requirements.txt
          pytest tests/
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway
        uses: railway/deploy-action@v1
        with:
          service: backend
          token: ${{ secrets.RAILWAY_TOKEN }}
```

## 10. Development Timeline with Claude Code

### Phase 1: Foundation (Week 1-2)
```
Day 1-2: Project Setup
- Initialize repos
- Setup Supabase/Neon
- Configure environments

Day 3-5: Database & Auth
- Generate all models with Claude Code
- Implement JWT auth
- Setup role-based access

Day 6-10: Core APIs
- Member management APIs
- Organization APIs
- Basic CRUD operations
```

### Phase 2: Integration (Week 3-4)
```
Day 11-15: Nice Pay Integration
- API client implementation
- Polling system
- Error handling

Day 16-20: Payment Processing
- CMS registration
- Payment processing
- Settlement calculation
```

### Phase 3: Frontend (Week 5-6)
```
Day 21-25: Admin Dashboard
- Layout & navigation
- Member management UI
- Payment management UI

Day 26-30: Parent Portal
- Payment status page
- Payment history
- Profile management
```

### Phase 4: Polish (Week 7-8)
```
Day 31-35: Testing & Optimization
- Integration tests
- Performance optimization
- Bug fixes

Day 36-40: Deployment
- Production setup
- Monitoring setup
- Documentation
```

## 11. Risk Mitigation

### Technical Risks
1. **Nice Pay API 장애**
   - Solution: Retry mechanism + Circuit breaker
   - Fallback: Manual processing queue

2. **Database Performance**
   - Solution: Connection pooling + Read replicas
   - Monitoring: Slow query logging

3. **Payment Processing Failures**
   - Solution: Idempotency keys + Transaction logs
   - Recovery: Manual reconciliation tools

### Business Risks
1. **Data Loss**
   - Solution: Daily backups + Point-in-time recovery
   - Testing: Regular restore drills

2. **Security Breach**
   - Solution: Regular security audits
   - Compliance: PCI DSS guidelines

## 12. Success Metrics

### Technical KPIs
- API Response Time: < 200ms (p95)
- Uptime: 99.9%
- Payment Success Rate: > 95%
- Error Rate: < 0.1%

### Business KPIs
- User Activation Rate
- Payment Collection Rate
- Customer Support Tickets
- System Adoption Rate