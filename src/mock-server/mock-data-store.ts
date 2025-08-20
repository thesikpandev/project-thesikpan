/**
 * Mock Data Store for NICEPAY API
 * In-memory storage for testing purposes
 */

import { MemberInfo, PaymentInfo } from '../types/nicepay.types';

interface EvidenceFile {
  agreetype: string;
  fileext: string;
  uploadDate: string;
  isBase64?: boolean;
}

export class MockDataStore {
  private members: Map<string, MemberInfo> = new Map();
  private payments: Map<string, PaymentInfo> = new Map();
  private evidenceFiles: Map<string, EvidenceFile> = new Map();
  
  // ==================== Member Management ====================
  
  getMemberKey(serviceId: string, memberId: string): string {
    return `${serviceId}:${memberId}`;
  }
  
  storeMember(serviceId: string, memberId: string, member: MemberInfo): void {
    const key = this.getMemberKey(serviceId, memberId);
    this.members.set(key, member);
  }
  
  getMember(serviceId: string, memberId: string): MemberInfo | undefined {
    const key = this.getMemberKey(serviceId, memberId);
    return this.members.get(key);
  }
  
  updateMember(serviceId: string, memberId: string, updates: Partial<MemberInfo>): void {
    const key = this.getMemberKey(serviceId, memberId);
    const existing = this.members.get(key);
    if (existing) {
      this.members.set(key, { ...existing, ...updates });
    }
  }
  
  deleteMember(serviceId: string, memberId: string): boolean {
    const key = this.getMemberKey(serviceId, memberId);
    return this.members.delete(key);
  }
  
  // ==================== Payment Management ====================
  
  getPaymentKey(serviceId: string, date: string, messageNo: string): string {
    return `${serviceId}:${date}:${messageNo}`;
  }
  
  storePayment(serviceId: string, date: string, messageNo: string, payment: PaymentInfo): void {
    const key = this.getPaymentKey(serviceId, date, messageNo);
    this.payments.set(key, payment);
  }
  
  getPayment(serviceId: string, date: string, messageNo: string): PaymentInfo | undefined {
    const key = this.getPaymentKey(serviceId, date, messageNo);
    return this.payments.get(key);
  }
  
  updatePayment(serviceId: string, date: string, messageNo: string, updates: Partial<PaymentInfo>): void {
    const key = this.getPaymentKey(serviceId, date, messageNo);
    const existing = this.payments.get(key);
    if (existing) {
      this.payments.set(key, { ...existing, ...updates });
    }
  }
  
  deletePayment(serviceId: string, date: string, messageNo: string): boolean {
    const key = this.getPaymentKey(serviceId, date, messageNo);
    return this.payments.delete(key);
  }
  
  getPaymentsByDate(serviceId: string, date: string): PaymentInfo[] {
    const payments: PaymentInfo[] = [];
    const prefix = `${serviceId}:${date}:`;
    
    this.payments.forEach((payment, key) => {
      if (key.startsWith(prefix)) {
        payments.push(payment);
      }
    });
    
    return payments;
  }
  
  // ==================== Evidence File Management ====================
  
  getEvidenceKey(serviceId: string, memberId: string): string {
    return `${serviceId}:${memberId}`;
  }
  
  storeEvidenceFile(serviceId: string, memberId: string, file: EvidenceFile): void {
    const key = this.getEvidenceKey(serviceId, memberId);
    this.evidenceFiles.set(key, file);
  }
  
  getEvidenceFile(serviceId: string, memberId: string): EvidenceFile | undefined {
    const key = this.getEvidenceKey(serviceId, memberId);
    return this.evidenceFiles.get(key);
  }
  
  deleteEvidenceFile(serviceId: string, memberId: string): boolean {
    const key = this.getEvidenceKey(serviceId, memberId);
    return this.evidenceFiles.delete(key);
  }
  
  // ==================== Utility Methods ====================
  
  clearAll(): void {
    this.members.clear();
    this.payments.clear();
    this.evidenceFiles.clear();
  }
  
  getStats(): {
    totalMembers: number;
    totalPayments: number;
    totalEvidenceFiles: number;
  } {
    return {
      totalMembers: this.members.size,
      totalPayments: this.payments.size,
      totalEvidenceFiles: this.evidenceFiles.size
    };
  }
  
  // Generate test data
  generateTestData(serviceId: string): void {
    // Generate test members
    const testMembers = [
      {
        memberId: 'test_user_001',
        memberName: '홍길동',
        serviceCd: 'BANK' as const,
        bankCd: '004', // 국민은행
        accountNo: '12345678901234',
        accountName: '홍길동',
        idNo: '900101',
        hpNo: '01012345678',
        status: 1 as const, // 정상등록
        bankResultMsg: '정상 등록',
        regDt: '20240101',
        bankSendDt: '20240101'
      },
      {
        memberId: 'test_user_002',
        memberName: '김철수',
        serviceCd: 'CARD' as const,
        cardNo: '1234567890123456',
        valYn: '2512',
        hpNo: '01098765432',
        status: 1 as const,
        bankResultMsg: '정상 등록',
        regDt: '20240102',
        bankSendDt: '20240102'
      }
    ];
    
    testMembers.forEach(member => {
      this.storeMember(serviceId, member.memberId, member as MemberInfo);
    });
    
    // Generate test payments
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const testPayments = [
      {
        memberId: 'test_user_001',
        memberName: '홍길동',
        reqAmt: '50000',
        serviceCd: 'BANK' as const,
        status: 1 as const, // 출금성공
        sendDt: today,
        messageNo: '000001',
        bankResultCd: '0000',
        bankResultMsg: '정상 출금',
        cashRcpYn: 'Y' as const,
        fee: '500',
        registrationTime: new Date().toISOString()
      },
      {
        memberId: 'test_user_002',
        memberName: '김철수',
        reqAmt: '100000',
        serviceCd: 'CARD' as const,
        status: 1 as const,
        sendDt: today,
        messageNo: '000002',
        bankResultMsg: '정상 승인',
        cashRcpYn: 'Y' as const,
        appDt: today,
        appNo: '12345678',
        fee: '1000',
        registrationTime: new Date().toISOString()
      }
    ];
    
    testPayments.forEach((payment, index) => {
      const messageNo = String(index + 1).padStart(6, '0');
      this.storePayment(serviceId, today, messageNo, payment as PaymentInfo);
    });
  }
}