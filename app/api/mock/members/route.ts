import { NextRequest, NextResponse } from 'next/server';

// 회원 데이터 스토어
const members = new Map([
  ['1001', {
    memberId: '1001',
    name: '홍길동',
    bank: 'SHINHAN',
    accountNumber: '110111222333',
    accountHolder: '홍길동',
    registeredAt: new Date('2024-01-15').toISOString(),
    status: 'ACTIVE'
  }],
  ['1002', {
    memberId: '1002',
    name: '김철수',
    bank: 'KB',
    accountNumber: '123456789012',
    accountHolder: '김철수',
    registeredAt: new Date('2024-02-20').toISOString(),
    status: 'ACTIVE'
  }]
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  
  if (memberId) {
    const member = members.get(memberId);
    if (member) {
      return NextResponse.json({
        result: 'SUCCESS',
        data: member
      });
    }
    return NextResponse.json({
      result: 'FAIL',
      message: 'Member not found'
    }, { status: 404 });
  }
  
  return NextResponse.json({
    result: 'SUCCESS',
    data: Array.from(members.values())
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, name, bank, accountNumber, accountHolder } = body;
    
    if (!memberId || !name || !bank || !accountNumber) {
      return NextResponse.json({
        result: 'FAIL',
        message: 'Missing required fields'
      }, { status: 400 });
    }
    
    if (members.has(memberId)) {
      return NextResponse.json({
        result: 'FAIL',
        message: 'Member already exists'
      }, { status: 409 });
    }
    
    const newMember = {
      memberId,
      name,
      bank,
      accountNumber,
      accountHolder: accountHolder || name,
      registeredAt: new Date().toISOString(),
      status: 'ACTIVE'
    };
    
    members.set(memberId, newMember);
    
    return NextResponse.json({
      result: 'SUCCESS',
      data: newMember
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      result: 'FAIL',
      message: 'Invalid request body'
    }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  
  if (!memberId) {
    return NextResponse.json({
      result: 'FAIL',
      message: 'Member ID is required'
    }, { status: 400 });
  }
  
  if (!members.has(memberId)) {
    return NextResponse.json({
      result: 'FAIL',
      message: 'Member not found'
    }, { status: 404 });
  }
  
  members.delete(memberId);
  
  return NextResponse.json({
    result: 'SUCCESS',
    message: 'Member deleted successfully'
  });
}