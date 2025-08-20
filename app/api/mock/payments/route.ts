import { NextRequest, NextResponse } from 'next/server';

// 출금 데이터 스토어
const payments = new Map([
  ['PAY001', {
    paymentId: 'PAY001',
    memberId: '1001',
    memberName: '홍길동',
    amount: 50000,
    bank: 'SHINHAN',
    accountNumber: '110111222333',
    status: 'COMPLETED',
    requestedAt: new Date('2024-03-01').toISOString(),
    processedAt: new Date('2024-03-01').toISOString()
  }],
  ['PAY002', {
    paymentId: 'PAY002',
    memberId: '1002',
    memberName: '김철수',
    amount: 100000,
    bank: 'KB',
    accountNumber: '123456789012',
    status: 'PENDING',
    requestedAt: new Date('2024-03-15').toISOString(),
    processedAt: null
  }]
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('paymentId');
  const memberId = searchParams.get('memberId');
  const status = searchParams.get('status');
  
  let results = Array.from(payments.values());
  
  if (paymentId) {
    const payment = payments.get(paymentId);
    if (payment) {
      return NextResponse.json({
        result: 'SUCCESS',
        data: payment
      });
    }
    return NextResponse.json({
      result: 'FAIL',
      message: 'Payment not found'
    }, { status: 404 });
  }
  
  if (memberId) {
    results = results.filter(p => p.memberId === memberId);
  }
  
  if (status) {
    results = results.filter(p => p.status === status);
  }
  
  return NextResponse.json({
    result: 'SUCCESS',
    data: results,
    total: results.length
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, memberName, amount, bank, accountNumber } = body;
    
    if (!memberId || !amount || !bank || !accountNumber) {
      return NextResponse.json({
        result: 'FAIL',
        message: 'Missing required fields'
      }, { status: 400 });
    }
    
    const paymentId = `PAY${String(payments.size + 1).padStart(3, '0')}`;
    
    const newPayment = {
      paymentId,
      memberId,
      memberName: memberName || 'Unknown',
      amount,
      bank,
      accountNumber,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      processedAt: null
    };
    
    payments.set(paymentId, newPayment);
    
    // 시뮬레이션: 3초 후 자동으로 COMPLETED로 변경
    setTimeout(() => {
      const payment = payments.get(paymentId);
      if (payment && payment.status === 'PENDING') {
        payment.status = 'COMPLETED';
        payment.processedAt = new Date().toISOString();
      }
    }, 3000);
    
    return NextResponse.json({
      result: 'SUCCESS',
      data: newPayment
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      result: 'FAIL',
      message: 'Invalid request body'
    }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    
    if (!paymentId) {
      return NextResponse.json({
        result: 'FAIL',
        message: 'Payment ID is required'
      }, { status: 400 });
    }
    
    const payment = payments.get(paymentId);
    if (!payment) {
      return NextResponse.json({
        result: 'FAIL',
        message: 'Payment not found'
      }, { status: 404 });
    }
    
    const body = await request.json();
    const { status } = body;
    
    if (status) {
      payment.status = status;
      if (status === 'COMPLETED') {
        payment.processedAt = new Date().toISOString();
      }
    }
    
    return NextResponse.json({
      result: 'SUCCESS',
      data: payment
    });
  } catch (error) {
    return NextResponse.json({
      result: 'FAIL',
      message: 'Invalid request body'
    }, { status: 400 });
  }
}