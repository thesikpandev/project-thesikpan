# 더식판 서비스 Database Schema
# SQLModel + PostgreSQL (Supabase/Neon)

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from enum import Enum
from sqlmodel import Field, SQLModel, Relationship, Column, JSON
from sqlalchemy import UniqueConstraint, Index, CheckConstraint

# ======================== ENUMS ========================

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"  # 본사
    REGIONAL_ADMIN = "regional_admin"  # 세척센터
    LOCAL_ADMIN = "local_admin"  # 배송센터
    INSTITUTION = "institution"  # 교육기관
    PARENT = "parent"  # 학부모

class ServiceStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"
    PENDING = "pending"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class PaymentMethod(str, Enum):
    BANK = "bank"
    CARD = "card"

class CMSStatus(str, Enum):
    PENDING = "pending"  # 등록대기
    ACTIVE = "active"  # 정상등록
    FAILED = "failed"  # 등록실패
    TERMINATED = "terminated"  # 해지

class SettlementStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    FAILED = "failed"

# ======================== BASE MODELS ========================

class TimestampMixin(SQLModel):
    """모든 테이블에 공통으로 사용되는 타임스탬프"""
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow})

# ======================== USER & AUTH ========================

class User(TimestampMixin, SQLModel, table=True):
    """사용자 기본 정보"""
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    phone: str = Field(index=True, max_length=20)
    password_hash: str = Field(max_length=255)
    name: str = Field(max_length=100)
    role: UserRole
    is_active: bool = Field(default=True)
    last_login: Optional[datetime] = None
    
    # 소속 조직 (역할에 따라 다름)
    organization_id: Optional[int] = Field(default=None, foreign_key="organizations.id")
    
    # Relationships
    organization: Optional["Organization"] = Relationship(back_populates="users")
    parent_info: Optional["Parent"] = Relationship(back_populates="user")
    
    __table_args__ = (
        Index("idx_user_email_active", "email", "is_active"),
    )

# ======================== ORGANIZATION ========================

class Organization(TimestampMixin, SQLModel, table=True):
    """조직 (본사/세척센터/배송센터/교육기관)"""
    __tablename__ = "organizations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True, max_length=20)  # 조직 코드
    name: str = Field(max_length=200)
    type: str = Field(max_length=50)  # HQ, WASH_CENTER, DELIVERY_CENTER, INSTITUTION
    
    # 계층 구조
    parent_id: Optional[int] = Field(default=None, foreign_key="organizations.id")
    level: int = Field(default=0)  # 0:본사, 1:세척센터, 2:배송센터, 3:교육기관
    
    # 사업자 정보
    business_number: Optional[str] = Field(max_length=20)
    representative: Optional[str] = Field(max_length=100)
    
    # 주소
    address: str = Field(max_length=500)
    address_detail: Optional[str] = Field(max_length=200)
    postal_code: Optional[str] = Field(max_length=10)
    
    # 연락처
    contact_name: Optional[str] = Field(max_length=100)
    contact_phone: Optional[str] = Field(max_length=20)
    contact_email: Optional[str] = Field(max_length=255)
    
    # 서비스 정보
    service_area: Optional[str] = Field(max_length=200)  # 서비스 지역
    is_active: bool = Field(default=True)
    
    # Relationships
    users: List["User"] = Relationship(back_populates="organization")
    children: List["Organization"] = Relationship(back_populates="parent")
    parent: Optional["Organization"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "Organization.id"}
    )
    
    __table_args__ = (
        Index("idx_org_parent_type", "parent_id", "type"),
        Index("idx_org_code_active", "code", "is_active"),
    )

# ======================== MEMBER (학부모/아동) ========================

class Parent(TimestampMixin, SQLModel, table=True):
    """학부모 정보"""
    __tablename__ = "parents"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True)
    member_code: str = Field(unique=True, index=True, max_length=50)  # 회원번호
    
    # 개인정보
    name: str = Field(max_length=100)
    phone: str = Field(max_length=20)
    email: Optional[str] = Field(max_length=255)
    address: Optional[str] = Field(max_length=500)
    
    # 서비스 정보
    service_status: ServiceStatus = Field(default=ServiceStatus.PENDING)
    service_start_date: Optional[date] = None
    service_end_date: Optional[date] = None
    
    # 관리 센터
    wash_center_id: Optional[int] = Field(foreign_key="organizations.id")
    delivery_center_id: Optional[int] = Field(foreign_key="organizations.id")
    
    # Relationships
    user: User = Relationship(back_populates="parent_info")
    children: List["Child"] = Relationship(back_populates="parent")
    payments: List["Payment"] = Relationship(back_populates="parent")
    cms_info: Optional["CMSInfo"] = Relationship(back_populates="parent")

class Child(TimestampMixin, SQLModel, table=True):
    """자녀 정보"""
    __tablename__ = "children"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="parents.id")
    
    name: str = Field(max_length=100)
    birth_date: date
    
    # 교육기관 정보
    institution_id: int = Field(foreign_key="organizations.id")
    class_name: str = Field(max_length=100)  # 반 이름
    
    # 서비스 정보
    is_active: bool = Field(default=True)
    service_start_date: date
    service_end_date: Optional[date] = None
    
    # 특이사항
    notes: Optional[str] = Field(max_length=1000)
    allergy_info: Optional[str] = Field(max_length=500)
    
    # Relationships
    parent: Parent = Relationship(back_populates="children")
    institution: Organization = Relationship()
    
    __table_args__ = (
        Index("idx_child_parent_institution", "parent_id", "institution_id"),
    )

# ======================== CMS & PAYMENT ========================

class CMSInfo(TimestampMixin, SQLModel, table=True):
    """CMS 자동이체 정보"""
    __tablename__ = "cms_info"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="parents.id", unique=True)
    
    # 결제 수단
    payment_method: PaymentMethod
    
    # 계좌 정보 (BANK인 경우)
    bank_code: Optional[str] = Field(max_length=10)
    account_number: Optional[str] = Field(max_length=50)
    account_holder: Optional[str] = Field(max_length=100)
    account_birth_date: Optional[str] = Field(max_length=10)  # YYMMDD or 사업자번호
    
    # 카드 정보 (CARD인 경우)
    card_number_masked: Optional[str] = Field(max_length=20)  # ****-****-****-1234
    card_expiry: Optional[str] = Field(max_length=4)  # YYMM
    
    # CMS 등록 정보
    cms_status: CMSStatus = Field(default=CMSStatus.PENDING)
    cms_member_id: Optional[str] = Field(max_length=50)  # 나이스페이 회원ID
    payment_day: int = Field(default=5)  # 출금일 (5, 10, 15, 21)
    
    # 출금동의 정보
    consent_date: Optional[datetime] = None
    consent_file_url: Optional[str] = Field(max_length=500)
    
    # 나이스페이 응답 정보
    nice_result_code: Optional[str] = Field(max_length=10)
    nice_result_msg: Optional[str] = Field(max_length=500)
    nice_bank_send_date: Optional[date] = None
    
    # 현금영수증
    cash_receipt_type: Optional[int] = None  # 1: 소득공제, 2: 지출증빙
    cash_receipt_number: Optional[str] = Field(max_length=20)
    
    # Relationships
    parent: Parent = Relationship(back_populates="cms_info")
    
    __table_args__ = (
        Index("idx_cms_status_method", "cms_status", "payment_method"),
        CheckConstraint("payment_day IN (5, 10, 15, 21)", name="check_payment_day"),
    )

class Payment(TimestampMixin, SQLModel, table=True):
    """결제 내역"""
    __tablename__ = "payments"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="parents.id")
    
    # 결제 정보
    payment_date: date = Field(index=True)
    payment_month: str = Field(max_length=7, index=True)  # YYYY-MM
    amount: Decimal = Field(max_digits=10, decimal_places=2)
    
    # 결제 상태
    status: PaymentStatus = Field(default=PaymentStatus.PENDING, index=True)
    payment_method: PaymentMethod
    
    # 나이스페이 정보
    nice_tid: Optional[str] = Field(max_length=100, unique=True)  # 거래 ID
    nice_message_no: Optional[str] = Field(max_length=20)  # 전문번호
    nice_payment_date: Optional[datetime] = None
    nice_result_code: Optional[str] = Field(max_length=10)
    nice_result_msg: Optional[str] = Field(max_length=500)
    
    # 수수료
    fee: Decimal = Field(default=0, max_digits=10, decimal_places=2)
    
    # 재시도 정보
    retry_count: int = Field(default=0)
    last_retry_date: Optional[datetime] = None
    
    # 취소/환불 정보
    cancelled_at: Optional[datetime] = None
    cancel_reason: Optional[str] = Field(max_length=500)
    refund_amount: Optional[Decimal] = Field(max_digits=10, decimal_places=2)
    
    # Relationships
    parent: Parent = Relationship(back_populates="payments")
    
    __table_args__ = (
        Index("idx_payment_parent_month", "parent_id", "payment_month"),
        Index("idx_payment_status_date", "status", "payment_date"),
        UniqueConstraint("parent_id", "payment_month", name="uq_parent_payment_month"),
    )

class PaymentLog(TimestampMixin, SQLModel, table=True):
    """결제 처리 로그 (Polling 등)"""
    __tablename__ = "payment_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    payment_id: Optional[int] = Field(foreign_key="payments.id")
    
    log_type: str = Field(max_length=50)  # REQUEST, RESPONSE, POLLING, ERROR
    request_data: Optional[dict] = Field(sa_column=Column(JSON))
    response_data: Optional[dict] = Field(sa_column=Column(JSON))
    
    status_code: Optional[int] = None
    error_message: Optional[str] = Field(max_length=1000)
    
    processed_at: datetime = Field(default_factory=datetime.utcnow)

# ======================== SETTLEMENT ========================

class Settlement(TimestampMixin, SQLModel, table=True):
    """정산 내역"""
    __tablename__ = "settlements"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    organization_id: int = Field(foreign_key="organizations.id")
    
    # 정산 기간
    settlement_month: str = Field(max_length=7, index=True)  # YYYY-MM
    settlement_date: date  # 정산일
    
    # 금액
    total_amount: Decimal = Field(max_digits=12, decimal_places=2)  # 총 결제액
    fee_amount: Decimal = Field(max_digits=12, decimal_places=2)  # 수수료
    settlement_amount: Decimal = Field(max_digits=12, decimal_places=2)  # 정산액
    
    # 건수
    payment_count: int = Field(default=0)
    success_count: int = Field(default=0)
    failed_count: int = Field(default=0)
    
    # 상태
    status: SettlementStatus = Field(default=SettlementStatus.PENDING)
    
    # 나이스페이 정산 정보
    nice_settlement_date: Optional[date] = None
    nice_settlement_status: Optional[str] = Field(max_length=50)
    
    # 처리 정보
    processed_at: Optional[datetime] = None
    processor_id: Optional[int] = Field(foreign_key="users.id")
    notes: Optional[str] = Field(max_length=1000)
    
    __table_args__ = (
        Index("idx_settlement_org_month", "organization_id", "settlement_month"),
        UniqueConstraint("organization_id", "settlement_month", name="uq_org_settlement_month"),
    )

# ======================== COMMUNICATION ========================

class Notification(TimestampMixin, SQLModel, table=True):
    """알림 내역"""
    __tablename__ = "notifications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="parents.id")
    
    type: str = Field(max_length=50)  # SMS, EMAIL, PUSH, KAKAO
    title: str = Field(max_length=200)
    message: str = Field(max_length=2000)
    
    # 발송 정보
    is_sent: bool = Field(default=False)
    sent_at: Optional[datetime] = None
    
    # 수신 정보
    is_read: bool = Field(default=False)
    read_at: Optional[datetime] = None
    
    # 메타 정보
    metadata: Optional[dict] = Field(sa_column=Column(JSON))
    
    __table_args__ = (
        Index("idx_notification_parent_type", "parent_id", "type"),
        Index("idx_notification_sent", "is_sent", "sent_at"),
    )

class ConsultationLog(TimestampMixin, SQLModel, table=True):
    """상담 이력 (채널톡 연동)"""
    __tablename__ = "consultation_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="parents.id")
    
    channel: str = Field(max_length=50)  # CHANNEL_TALK, PHONE, EMAIL
    category: str = Field(max_length=100)  # 결제문의, 서비스문의, 불만접수 등
    
    content: str = Field(max_length=5000)
    response: Optional[str] = Field(max_length=5000)
    
    # 담당자
    counselor_id: Optional[int] = Field(foreign_key="users.id")
    
    # 상태
    status: str = Field(max_length=50)  # OPEN, IN_PROGRESS, RESOLVED, CLOSED
    resolved_at: Optional[datetime] = None
    
    # 채널톡 정보
    channel_talk_id: Optional[str] = Field(max_length=100)
    
    __table_args__ = (
        Index("idx_consultation_parent_status", "parent_id", "status"),
    )

# ======================== LABEL & BATCH ========================

class LabelPrintJob(TimestampMixin, SQLModel, table=True):
    """라벨 출력 작업"""
    __tablename__ = "label_print_jobs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    organization_id: int = Field(foreign_key="organizations.id")
    
    print_date: date
    label_type: str = Field(max_length=50)  # STUDENT, DELIVERY, etc
    
    # 출력 정보
    total_count: int
    printed_count: int = Field(default=0)
    
    # 파일 정보
    file_url: Optional[str] = Field(max_length=500)
    
    # 상태
    status: str = Field(max_length=50)  # PENDING, PRINTING, COMPLETED, FAILED
    printed_at: Optional[datetime] = None
    printed_by: Optional[int] = Field(foreign_key="users.id")

# ======================== SYSTEM ========================

class SystemConfig(TimestampMixin, SQLModel, table=True):
    """시스템 설정"""
    __tablename__ = "system_configs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    category: str = Field(max_length=50, index=True)
    key: str = Field(max_length=100, index=True)
    value: str = Field(max_length=1000)
    description: Optional[str] = Field(max_length=500)
    
    __table_args__ = (
        UniqueConstraint("category", "key", name="uq_config_category_key"),
    )

class AuditLog(SQLModel, table=True):
    """감사 로그"""
    __tablename__ = "audit_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(foreign_key="users.id")
    
    action: str = Field(max_length=50)  # CREATE, UPDATE, DELETE, LOGIN, etc
    table_name: str = Field(max_length=50)
    record_id: Optional[int] = None
    
    old_values: Optional[dict] = Field(sa_column=Column(JSON))
    new_values: Optional[dict] = Field(sa_column=Column(JSON))
    
    ip_address: Optional[str] = Field(max_length=50)
    user_agent: Optional[str] = Field(max_length=500)
    
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    __table_args__ = (
        Index("idx_audit_user_action", "user_id", "action"),
        Index("idx_audit_table_record", "table_name", "record_id"),
    )

# ======================== INDEXES FOR PERFORMANCE ========================
# Additional indexes for common queries
"""
-- 미납자 조회 최적화
CREATE INDEX idx_payment_overdue ON payments (status, payment_month) 
WHERE status IN ('pending', 'failed');

-- 일별 출금 대상자 조회
CREATE INDEX idx_cms_payment_day ON cms_info (payment_day, cms_status) 
WHERE cms_status = 'active';

-- 센터별 회원 조회
CREATE INDEX idx_parent_centers ON parents (wash_center_id, delivery_center_id, service_status);

-- 월별 정산 조회
CREATE INDEX idx_settlement_month_status ON settlements (settlement_month, status);

-- Polling 대상 조회
CREATE INDEX idx_payment_polling ON payments (status, nice_payment_date) 
WHERE status = 'pending' AND nice_payment_date IS NOT NULL;
"""