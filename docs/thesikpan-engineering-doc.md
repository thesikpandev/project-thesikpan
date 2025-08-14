# 더식판 서비스 Engineering Design Document

## 1. System Architecture Overview

### 1.1 Tech Stack
```yaml
Full-Stack:
  - Framework: Next.js 14 (App Router + API Routes)
  - Language: TypeScript
  - Runtime: Node.js 20 LTS
  
Database & ORM:
  - Database: PostgreSQL (Supabase)
  - ORM: Prisma (Type-safe, Migration 지원)
  - Cache: Redis (Upstash Serverless)
  
Authentication & Storage:
  - Auth: Supabase Auth + NextAuth.js
  - File Storage: Supabase Storage
  - Real-time: Supabase Realtime
  
Frontend:
  - UI Framework: Shadcn/UI + Tailwind CSS  
  - State Management: Zustand + TanStack Query
  - Forms: React Hook Form + Zod
  - Charts: Recharts
  
Infrastructure:
  - Hosting: Vercel (Serverless)
  - Edge Functions: Vercel Edge Runtime
  - Cron Jobs: Vercel Cron
  - Monitoring: Sentry + Vercel Analytics
  - CI/CD: GitHub Actions
```

### 1.2 Architecture Diagram
```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                    │
│                         (CDN)                            │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                  Next.js Application                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │                Frontend (React)                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐  │  │
│  │  │  본사    │ │  센터    │ │ 교육기관 │ │학부모│  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │            API Routes (/app/api/*)                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐  │  │
│  │  │   Auth   │ │  Member  │ │  Payment │ │ Admin│  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Middleware & Edge Functions            │  │
│  │         (Auth, Rate Limiting, Validation)          │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────┬──────────────┬──────────────┬────────────┘
              │              │              │
              ▼              ▼              ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│   Supabase      │ │   Upstash   │ │  External APIs  │
│  - PostgreSQL   │ │    Redis    │ │  - NicePay CMS  │
│  - Auth         │ │   (Cache)   │ │  - SMS Gateway  │
│  - Storage      │ │             │ │                 │
│  - Realtime     │ │             │ │                 │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

## 2. Database Design

### 2.1 Prisma Schema
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 사용자 관리
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  phone         String   @unique
  name          String
  role          Role
  organization  Organization? @relation(fields: [organizationId], references: [id])
  organizationId String?
  parent        Parent?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([email])
  @@index([phone])
  @@index([organizationId])
}

enum Role {
  SUPER_ADMIN      // 본사 관리자
  REGIONAL_ADMIN   // 세척센터 관리자
  CENTER_ADMIN     // 배송센터 관리자
  INSTITUTION      // 교육기관 담당자
  PARENT          // 학부모
}

// 조직 관리 (본사, 세척센터, 배송센터)
model Organization {
  id           String         @id @default(cuid())
  name         String
  type         OrgType
  code         String         @unique
  parentOrg    Organization?  @relation("OrgHierarchy", fields: [parentOrgId], references: [id])
  parentOrgId  String?
  childOrgs    Organization[] @relation("OrgHierarchy")
  users        User[]
  institutions Institution[]
  settlements  Settlement[]
  nicepayCode  String?        // 나이스페이 이용기관코드
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  
  @@index([code])
  @@index([parentOrgId])
}

enum OrgType {
  HEADQUARTERS  // 본사
  WASHING       // 세척센터
  DELIVERY      // 배송센터
}

// 교육기관
model Institution {
  id            String         @id @default(cuid())
  name          String
  address       String
  contactName   String
  contactPhone  String
  organization  Organization   @relation(fields: [organizationId], references: [id])
  organizationId String
  children      Child[]
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  @@index([organizationId])
}

// 학부모
model Parent {
  id            String         @id @default(cuid())
  user          User           @relation(fields: [userId], references: [id])
  userId        String         @unique
  children      Child[]
  cmsInfo       CMSInfo?
  payments      Payment[]
  serviceStatus ServiceStatus  @default(PENDING)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  @@index([userId])
  @@index([serviceStatus])
}

// 자녀 정보
model Child {
  id            String        @id @default(cuid())
  name          String
  birthDate     DateTime
  parent        Parent        @relation(fields: [parentId], references: [id])
  parentId      String
  institution   Institution   @relation(fields: [institutionId], references: [id])
  institutionId String
  className     String
  labelInfo     Json?         // 라벨 출력 정보
  isActive      Boolean       @default(true)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  @@index([parentId])
  @@index([institutionId])
}

// CMS 출금 정보
model CMSInfo {
  id              String        @id @default(cuid())
  parent          Parent        @relation(fields: [parentId], references: [id])
  parentId        String        @unique
  nicepayMemberId String        @unique // 나이스페이 회원ID
  paymentMethod   PaymentMethod
  
  // 계좌 정보
  bankCode        String?
  accountNumber   String?       // 암호화 저장
  accountHolder   String?
  
  // 카드 정보  
  cardNumber      String?       // 마스킹 저장
  cardExpiry      String?       // 암호화 저장
  
  paymentDay      Int           // 출금일 (1-31)
  monthlyAmount   Int           // 월 출금액
  agreementFile   String?       // 출금동의서 파일 경로
  cmsStatus       CMSStatus     @default(PENDING)
  cmsStatusMsg    String?
  nicepayRegDate  DateTime?     // 나이스페이 등록일
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@index([parentId])
  @@index([nicepayMemberId])
  @@index([cmsStatus])
}

enum PaymentMethod {
  BANK          // 계좌이체
  CARD          // 카드
}

enum CMSStatus {
  PENDING       // 등록 대기
  REGISTERED    // 등록 완료
  FAILED        // 등록 실패
  TERMINATED    // 해지
}

enum ServiceStatus {
  PENDING       // 서비스 대기
  ACTIVE        // 서비스 이용중
  SUSPENDED     // 일시 중단
  TERMINATED    // 해지
}

// 결제 내역
model Payment {
  id              String        @id @default(cuid())
  parent          Parent        @relation(fields: [parentId], references: [id])
  parentId        String
  paymentMonth    String        // YYYY-MM
  amount          Int
  status          PaymentStatus @default(PENDING)
  nicepayTxId     String?       @unique // 나이스페이 전문번호
  requestDate     DateTime?     // 출금 요청일
  processDate     DateTime?     // 출금 처리일
  failReason      String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@unique([parentId, paymentMonth])
  @@index([parentId])
  @@index([paymentMonth])
  @@index([status])
  @@index([nicepayTxId])
}

enum PaymentStatus {
  PENDING       // 대기
  PROCESSING    // 처리중
  SUCCESS       // 성공
  FAILED        // 실패
  CANCELLED     // 취소
}

// 정산 내역
model Settlement {
  id              String         @id @default(cuid())
  organization    Organization   @relation(fields: [organizationId], references: [id])
  organizationId  String
  settlementMonth String         // YYYY-MM
  totalAmount     Int            // 총 수금액
  feeAmount       Int            // 수수료
  netAmount       Int            // 실 정산액
  settlementDate  DateTime?      // 정산일
  status          SettlementStatus @default(PENDING)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  @@unique([organizationId, settlementMonth])
  @@index([organizationId])
  @@index([settlementMonth])
  @@index([status])
}

enum SettlementStatus {
  PENDING       // 정산 대기
  COMPLETED     // 정산 완료
  HOLD          // 보류
}
```

### 2.2 Database Optimization
```typescript
// Prisma 쿼리 최적화 예시

// 1. 미납자 조회 with Prisma
async function getOverdueMembers(month: string) {
  return await prisma.parent.findMany({
    where: {
      serviceStatus: 'ACTIVE',
      payments: {
        some: {
          paymentMonth: month,
          status: {
            in: ['PENDING', 'FAILED']
          }
        }
      }
    },
    include: {
      user: true,
      children: {
        include: {
          institution: true
        }
      },
      payments: {
        where: {
          paymentMonth: month
        }
      }
    }
  });
}

// 2. 일별 출금 대상자 (인덱스 활용)
async function getDailyPaymentTargets(day: number) {
  return await prisma.cMSInfo.findMany({
    where: {
      paymentDay: day,
      cmsStatus: 'REGISTERED',
      parent: {
        serviceStatus: 'ACTIVE'
      }
    },
    include: {
      parent: {
        include: {
          user: true
        }
      }
    }
  });
}
```

## 3. API Design (Next.js API Routes)

### 3.1 API Structure
```
app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── refresh/route.ts
│   └── [...nextauth]/route.ts
├── members/
│   ├── route.ts              // GET (list), POST (create)
│   ├── [id]/route.ts         // GET, PUT, DELETE
│   └── [id]/cms/route.ts     // CMS 정보 관리
├── payments/
│   ├── route.ts              // 결제 목록
│   ├── process/route.ts      // 일괄 처리
│   └── [id]/route.ts         // 개별 결제 상세
├── nicepay/
│   ├── register/route.ts     // 회원 등록
│   ├── payment/route.ts      // 출금 신청
│   ├── status/route.ts       // 상태 조회
│   └── webhook/route.ts      // 나이스페이 콜백
├── organizations/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── settlements/route.ts
└── admin/
    ├── dashboard/route.ts
    └── reports/route.ts
```

### 3.2 API Route Implementation
```typescript
// app/api/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { z } from 'zod';

const CreateMemberSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^010-\d{4}-\d{4}$/),
  name: z.string().min(2),
  children: z.array(z.object({
    name: z.string(),
    birthDate: z.string(),
    institutionId: z.string(),
    className: z.string()
  }))
});

// GET /api/members - 회원 목록 조회
export async function GET(request: NextRequest) {
  return withAuth(request, ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'CENTER_ADMIN'], async (user) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    
    const where = {
      ...(status && { serviceStatus: status }),
      ...(user.role !== 'SUPER_ADMIN' && {
        user: {
          organizationId: user.organizationId
        }
      })
    };
    
    const [members, total] = await prisma.$transaction([
      prisma.parent.findMany({
        where,
        include: {
          user: true,
          children: true,
          cmsInfo: true
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.parent.count({ where })
    ]);
    
    return NextResponse.json({
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  });
}

// POST /api/members - 회원 등록
export async function POST(request: NextRequest) {
  return withAuth(request, ['SUPER_ADMIN', 'CENTER_ADMIN'], async (user) => {
    const body = await request.json();
    const validated = CreateMemberSchema.parse(body);
    
    // 트랜잭션으로 User, Parent, Children 생성
    const result = await prisma.$transaction(async (tx) => {
      // 1. User 생성
      const newUser = await tx.user.create({
        data: {
          email: validated.email,
          phone: validated.phone,
          name: validated.name,
          role: 'PARENT',
          organizationId: user.organizationId
        }
      });
      
      // 2. Parent 생성
      const parent = await tx.parent.create({
        data: {
          userId: newUser.id,
          serviceStatus: 'PENDING'
        }
      });
      
      // 3. Children 생성
      const children = await tx.child.createMany({
        data: validated.children.map(child => ({
          ...child,
          parentId: parent.id,
          birthDate: new Date(child.birthDate)
        }))
      });
      
      return { user: newUser, parent, children };
    });
    
    return NextResponse.json(result, { status: 201 });
  });
}
```

## 4. NicePay CMS Integration

### 4.1 NicePay Service Class
```typescript
// lib/nicepay/nicepay.service.ts
import { z } from 'zod';

interface NicePayConfig {
  baseUrl: string;
  apiKey: string;
  serviceId: string;
  isTest: boolean;
}

export class NicePayService {
  private config: NicePayConfig;
  
  constructor() {
    this.config = {
      baseUrl: process.env.NICEPAY_ENV === 'production' 
        ? 'https://rest.thebill.co.kr:4435'
        : 'https://rest-test.thebill.co.kr:7080',
      apiKey: process.env.NICEPAY_API_KEY!,
      serviceId: process.env.NICEPAY_SERVICE_ID!,
      isTest: process.env.NICEPAY_ENV !== 'production'
    };
  }
  
  // 증빙파일 업로드 (Base64)
  async uploadAgreement(memberId: string, fileData: string, fileExt: string) {
    const url = `${this.config.baseUrl}/thebill/retailers/${this.config.serviceId}/members/${memberId}/agree-enc`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Api-Key': this.config.apiKey,
        'Service-Type': 'B'
      },
      body: JSON.stringify({
        agreetype: '1', // 서면
        fileext: fileExt,
        encData: fileData
      })
    });
    
    if (!response.ok) {
      throw new Error(`NicePay API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  // 회원 등록
  async registerMember(data: {
    memberId: string;
    memberName: string;
    serviceCd: 'BANK' | 'CARD';
    bankCd?: string;
    accountNo?: string;
    accountName?: string;
    idNo?: string;
    cardNo?: string;
    valYn?: string;
    hpNo: string;
    email?: string;
  }) {
    const url = `${this.config.baseUrl}/thebill/retailers/${this.config.serviceId}/members/${data.memberId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Api-Key': this.config.apiKey,
        'Service-Type': 'B'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.resultCd !== '0000') {
      throw new Error(`NicePay Error: ${result.resultMsg}`);
    }
    
    return result;
  }
  
  // 회원 상태 조회
  async getMemberStatus(memberId: string) {
    const url = `${this.config.baseUrl}/thebill/retailers/${this.config.serviceId}/members/${memberId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Api-Key': this.config.apiKey,
        'Service-Type': 'B'
      }
    });
    
    return response.json();
  }
  
  // 출금 신청
  async requestPayment(data: {
    paymentDate: string; // YYYYMMDD
    txId: string;        // 전문번호 (6자리)
    memberId: string;
    memberName: string;
    amount: number;
    serviceCd: 'BANK' | 'CARD';
  }) {
    const url = `${this.config.baseUrl}/thebill/retailers/${this.config.serviceId}/payments/${data.paymentDate}/${data.txId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Api-Key': this.config.apiKey,
        'Service-Type': 'B'
      },
      body: JSON.stringify({
        memberId: data.memberId,
        memberName: data.memberName,
        reqAmt: data.amount.toString(),
        serviceCd: data.serviceCd,
        workType: 'N'
      })
    });
    
    return response.json();
  }
  
  // 출금 결과 조회
  async getPaymentStatus(paymentDate: string, txId: string) {
    const url = `${this.config.baseUrl}/thebill/retailers/${this.config.serviceId}/payments/${paymentDate}/${txId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Api-Key': this.config.apiKey,
        'Service-Type': 'B'
      }
    });
    
    return response.json();
  }
}

// Singleton instance
export const nicepayService = new NicePayService();
```

### 4.2 Scheduled Jobs (Vercel Cron) - 최소화

**Single Source of Truth 원칙**: 우리 DB가 모든 데이터의 기준이 되며, 나이스페이는 실제 출금 결과만 확인하는 용도로 사용

```typescript
// app/api/cron/payment-result/route.ts  
// 하루 1회만 실행 (D+1 13:00) - 실제 출금 결과만 확인
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nicepayService } from '@/lib/nicepay/nicepay.service';
import { format, addDays, isWeekend } from 'date-fns';

// Vercel Cron: 매일 오후 1시 실행 (D+1 13:00)
// vercel.json에 설정: {"crons": [{"path": "/api/cron/payment-result", "schedule": "0 4 * * *"}]}
export async function GET(request: NextRequest) {
  // Vercel Cron 인증 체크
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  try {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    // 주말 체크 (영업일만 처리)
    if (isWeekend(tomorrow)) {
      return NextResponse.json({ message: 'Weekend - skip processing' });
    }
    
    const paymentDate = format(tomorrow, 'yyyyMMdd');
    const targetDay = tomorrow.getDate();
    
    // 1. 어제 출금 요청한 건들의 결과만 확인 (우리 DB가 Source of Truth)
    const yesterday = addDays(today, -1);
    const pendingPayments = await prisma.payment.findMany({
      where: {
        requestDate: {
          gte: new Date(yesterday.setHours(0, 0, 0, 0)),
          lt: new Date(yesterday.setHours(23, 59, 59, 999))
        },
        status: 'PROCESSING'
      }
    });
    
    // 2. 나이스페이에서 실제 출금 결과만 확인
    const results = [];
    for (const payment of pendingPayments) {
      try {
        // 실제 출금 성공/실패 여부만 확인
        const result = await nicepayService.getPaymentResult({
          paymentDate: format(payment.requestDate, 'yyyyMMdd'),
          txId: payment.nicepayTxId
        });
        
        // 우리 DB에 결과 업데이트 (우리가 Single Source of Truth)
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: result.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
            resultCode: result.code,
            resultMessage: result.message,
            processedAt: new Date()
          }
        });
        
        // 미납 처리는 우리가 직접 관리
        if (result.status === 'FAILED') {
          await prisma.parent.update({
            where: { id: payment.parentId },
            data: {
              overdueMonths: { increment: 1 },
              overdueAmount: { increment: payment.amount }
            }
          });
        }
        
        results.push({ 
          paymentId: payment.id, 
          status: result.status,
          code: result.code
        });
      } catch (error) {
        results.push({ 
          paymentId: payment.id, 
          status: 'error', 
          error: error.message 
        });
      }
    }
    
    // 3. 은행 직접 해지건 확인 (하루 1회만)
    const directCancellations = await nicepayService.getDirectCancellations({
      date: format(yesterday, 'yyyyMMdd')
    });
    
    for (const cancellation of directCancellations) {
      await prisma.cMSInfo.update({
        where: { nicepayMemberId: cancellation.memberId },
        data: { 
          cmsStatus: 'CANCELLED',
          cancelReason: '은행 직접 해지',
          cancelledAt: new Date()
        }
      });
    }
    
    // 4. 처리 결과 로깅
    console.log('Payment result check completed:', {
      date: format(yesterday, 'yyyy-MM-dd'),
      processed: pendingPayments.length,
      directCancellations: directCancellations.length,
      results
    });
    
    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results 
    });
  } catch (error) {
    console.error('Daily payment processing error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// 전문번호 생성 (HHMMSS 형식)
function generateTxId(): string {
  const now = new Date();
  return format(now, 'HHmmss');
}
```

## 5. Frontend Architecture

### 5.1 App Directory Structure
```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (dashboard)/
│   ├── layout.tsx           # 대시보드 공통 레이아웃
│   ├── page.tsx            # 역할별 대시보드
│   ├── members/
│   │   ├── page.tsx        # 회원 목록
│   │   ├── [id]/page.tsx   # 회원 상세
│   │   └── new/page.tsx    # 회원 등록
│   ├── payments/
│   │   ├── page.tsx        # 결제 관리
│   │   └── overdue/page.tsx # 미납 관리
│   ├── settlements/
│   │   └── page.tsx        # 정산 관리
│   └── settings/
│       └── page.tsx        # 설정
├── (parent)/
│   ├── layout.tsx          # 학부모 전용 레이아웃
│   ├── page.tsx           # 결제 상태 확인
│   ├── history/page.tsx   # 결제 이력
│   └── profile/page.tsx   # 프로필 관리
├── api/                    # API Routes
├── components/
│   ├── ui/                # Shadcn/UI 컴포넌트
│   ├── features/          # 비즈니스 컴포넌트
│   └── layouts/           # 레이아웃 컴포넌트
└── lib/
    ├── prisma.ts          # Prisma Client
    ├── auth.ts            # 인증 관련
    ├── utils.ts           # 유틸리티
    └── nicepay/           # 나이스페이 서비스
```

### 5.2 Real-time Updates with Supabase
```typescript
// components/features/payment-status.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RealtimeChannel } from '@supabase/supabase-js';

export function PaymentStatus({ parentId }: { parentId: string }) {
  const [payment, setPayment] = useState(null);
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    // 초기 데이터 로드
    fetchPayment();
    
    // Realtime 구독
    const channel: RealtimeChannel = supabase
      .channel('payment-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Payment',
          filter: `parentId=eq.${parentId}`
        },
        (payload) => {
          console.log('Payment update:', payload);
          setPayment(payload.new);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentId]);
  
  async function fetchPayment() {
    const { data } = await supabase
      .from('Payment')
      .select('*')
      .eq('parentId', parentId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();
    
    setPayment(data);
  }
  
  return (
    <div className="p-4 border rounded-lg">
      {payment ? (
        <div>
          <h3 className="font-semibold">결제 상태</h3>
          <p>월: {payment.paymentMonth}</p>
          <p>금액: {payment.amount.toLocaleString()}원</p>
          <p>상태: {getStatusLabel(payment.status)}</p>
        </div>
      ) : (
        <p>결제 정보를 불러오는 중...</p>
      )}
    </div>
  );
}
```

## 6. Security & Performance

### 6.1 Authentication Middleware
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Role-based access control
    const userRole = session.user.user_metadata?.role;
    if (!['SUPER_ADMIN', 'REGIONAL_ADMIN', 'CENTER_ADMIN'].includes(userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  // API rate limiting
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1';
    const rateLimit = await checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }
  
  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*', '/parent/:path*']
};
```

### 6.2 Data Encryption
```typescript
// lib/crypto.ts
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// 계좌번호 마스킹
export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return '****';
  return accountNumber.slice(0, -4).replace(/./g, '*') + accountNumber.slice(-4);
}
```

### 6.3 Caching Strategy (Upstash Redis)
```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5분 기본값
): Promise<T> {
  // 캐시 확인
  const cached = await redis.get<T>(key);
  if (cached) {
    return cached;
  }
  
  // 데이터 조회 및 캐싱
  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  
  return data;
}

// 대시보드 통계 캐싱 예시
export async function getDashboardStats(organizationId: string) {
  return getCachedData(
    `dashboard:${organizationId}`,
    async () => {
      const [totalMembers, activePayments, overdueCount] = await prisma.$transaction([
        prisma.parent.count({
          where: { 
            user: { organizationId },
            serviceStatus: 'ACTIVE'
          }
        }),
        prisma.payment.count({
          where: {
            parent: { user: { organizationId } },
            status: 'SUCCESS',
            paymentMonth: format(new Date(), 'yyyy-MM')
          }
        }),
        prisma.payment.count({
          where: {
            parent: { user: { organizationId } },
            status: { in: ['PENDING', 'FAILED'] },
            paymentMonth: format(new Date(), 'yyyy-MM')
          }
        })
      ]);
      
      return { totalMembers, activePayments, overdueCount };
    },
    600 // 10분 캐시
  );
}
```

## 7. Deployment & DevOps

### 7.1 Environment Variables
```bash
# .env.local
# Database
DATABASE_URL="postgresql://user:password@db.supabase.co:5432/postgres"
DIRECT_URL="postgresql://user:password@db.supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="anon-key"
SUPABASE_SERVICE_ROLE_KEY="service-role-key"

# NicePay CMS
NICEPAY_ENV="test" # or "production"
NICEPAY_API_KEY="your-api-key"
NICEPAY_SERVICE_ID="30000000"

# Redis Cache
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Security
ENCRYPTION_KEY="64-char-hex-string"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="https://your-domain.com"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
NEXT_PUBLIC_SENTRY_DSN="your-public-sentry-dsn"

# Cron Jobs
CRON_SECRET="your-cron-secret"
```

### 7.2 Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "app/api/cron/daily-payment/route.ts": {
      "maxDuration": 60
    },
    "app/api/payments/process/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/daily-payment",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/payment-status-check",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/cron/monthly-settlement",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

### 7.3 GitHub Actions CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm run test
      
      - name: Generate Prisma Client
        run: npx prisma generate

  deploy-preview:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build Project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy to Preview
        run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy to Production
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Run Database Migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## 8. Development Timeline

### Phase 1: Foundation (Week 1-2)
```
Day 1-2: 프로젝트 초기 설정
- Next.js 14 프로젝트 생성
- Supabase 프로젝트 설정
- Prisma 스키마 정의 및 마이그레이션
- Vercel 프로젝트 연결

Day 3-5: 인증 시스템
- Supabase Auth 설정
- NextAuth.js 통합
- 역할 기반 접근 제어 구현
- 미들웨어 설정

Day 6-10: 핵심 API 개발
- 회원 관리 API Routes
- 조직 관리 API Routes
- 기본 CRUD 작업 구현
```

### Phase 2: CMS Integration (Week 3-4)
```
Day 11-15: 나이스페이 연동
- CMS API 클라이언트 구현
- 증빙파일 업로드 기능
- 회원 등록/조회 API
- 에러 핸들링 및 재시도 로직

Day 16-20: 결제 처리
- 출금 신청 프로세스
- 결제 상태 폴링
- Vercel Cron을 통한 일일 배치
- 정산 계산 로직
```

### Phase 3: Frontend Development (Week 5-6)
```
Day 21-25: 관리자 대시보드
- 레이아웃 및 네비게이션
- 회원 관리 UI
- 결제 관리 UI
- 실시간 대시보드 위젯

Day 26-30: 학부모 포털
- 결제 상태 페이지
- 결제 이력 조회
- 프로필 관리
- 모바일 반응형 디자인
```

### Phase 4: Polish & Launch (Week 7-8)
```
Day 31-35: 테스트 및 최적화
- E2E 테스트 작성
- 성능 최적화
- 보안 감사
- 버그 수정

Day 36-40: 배포 준비
- Production 환경 설정
- 모니터링 설정 (Sentry)
- 문서화
- 운영 가이드 작성
```

## 9. Monitoring & Maintenance

### 9.1 Health Checks
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Redis } from '@upstash/redis';

export async function GET() {
  const checks = {
    database: false,
    redis: false,
    nicepay: false
  };
  
  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database check failed:', error);
  }
  
  try {
    // Redis check
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    console.error('Redis check failed:', error);
  }
  
  try {
    // NicePay API check
    const response = await fetch(
      `${process.env.NICEPAY_BASE_URL}/health`,
      { method: 'HEAD' }
    );
    checks.nicepay = response.ok;
  } catch (error) {
    console.error('NicePay check failed:', error);
  }
  
  const allHealthy = Object.values(checks).every(v => v);
  
  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    },
    { status: allHealthy ? 200 : 503 }
  );
}
```

### 9.2 Error Tracking (Sentry)
```typescript
// app/layout.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

## 10. Success Metrics

### Technical KPIs
- **API Response Time**: < 200ms (p95)
- **Vercel Function Duration**: < 10s
- **Database Query Time**: < 100ms
- **Cache Hit Rate**: > 80%
- **Uptime**: 99.9%

### Business KPIs  
- **User Activation Rate**: > 80%
- **Payment Success Rate**: > 95%
- **Settlement Accuracy**: 100%
- **Support Ticket Resolution**: < 24h

## 11. Cost Optimization

### Vercel Usage
- **Free Tier**: 100GB bandwidth, 100GB-hours serverless
- **Pro Plan** ($20/month): 필요시 업그레이드
- **Function 최적화**: Edge Runtime 활용

### Supabase Usage
- **Free Tier**: 500MB DB, 2GB bandwidth, 50K MAU
- **Pro Plan** ($25/month): Production 환경

### Upstash Redis
- **Free Tier**: 10K commands/day
- **Pay-as-you-go**: $0.2 per 100K commands

### 예상 월 비용 (1000명 기준)
- Vercel Pro: $20
- Supabase Pro: $25
- Upstash: ~$10
- **Total: ~$55/month**