import { NextRequest, NextResponse } from 'next/server';

// Mock 데이터 스토어
const mockData = {
  members: new Map([
    ['1001', {
      memberId: '1001',
      name: '홍길동',
      bank: 'SHINHAN',
      accountNumber: '110111222333',
      registeredAt: new Date('2024-01-15').toISOString()
    }],
    ['1002', {
      memberId: '1002',
      name: '김철수',
      bank: 'KB',
      accountNumber: '123456789012',
      registeredAt: new Date('2024-02-20').toISOString()
    }]
  ]),
  payments: new Map([
    ['PAY001', {
      paymentId: 'PAY001',
      memberId: '1001',
      amount: 50000,
      status: 'COMPLETED',
      processedAt: new Date('2024-03-01').toISOString()
    }],
    ['PAY002', {
      paymentId: 'PAY002',
      memberId: '1002',
      amount: 100000,
      status: 'PENDING',
      processedAt: null
    }]
  ]),
  evidenceFiles: new Map()
};

export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url);
  
  return NextResponse.json({
    status: 'ok',
    message: 'NICEPAY Mock API is running',
    endpoints: {
      members: '/api/mock/members',
      payments: '/api/mock/payments',
      evidence: '/api/mock/evidence'
    },
    stats: {
      totalMembers: mockData.members.size,
      totalPayments: mockData.payments.size,
      totalEvidence: mockData.evidenceFiles.size
    }
  });
}