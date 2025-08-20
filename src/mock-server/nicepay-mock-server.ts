/**
 * NICEPAY CMS API Mock Server
 * Simulates NICEPAY's CMS API for development and testing
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cors from 'cors';
import {
  BaseResponse,
  MemberRegistrationRequest,
  MemberRegistrationResponse,
  MemberInfo,
  PaymentRequest,
  PaymentResponse,
  PaymentInfo,
  SettlementStatusResponse,
  ChangeHistoryResponse,
  EvidenceFileUploadRequest,
  ServiceCode,
  MemberStatus,
  PaymentStatus,
  SettlementStatus,
  BANK_CODES
} from '../types/nicepay.types';
import { MockDataStore } from './mock-data-store';
import { SettlementCalendar } from './settlement-calendar';

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 } // 300KB limit
});

// Mock data store instance
const dataStore = new MockDataStore();
const settlementCalendar = new SettlementCalendar();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// API Key validation middleware
const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['api-key'];
  const serviceType = req.headers['service-type'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Api-Key header is required' });
  }
  
  if (serviceType !== 'B') {
    return res.status(400).json({ 
      resultCd: '1003',
      resultMsg: '서비스 타입 오류 - Header 서비스 타입이 B가 아님'
    });
  }
  
  // In mock server, accept any API key for testing
  next();
};

// ==================== Evidence File APIs ====================

// Upload evidence file (multipart/form-data)
app.post('/thebill/retailers/:serviceId/members/:memberId/agree',
  validateApiKey,
  upload.single('filename'),
  async (req: Request, res: Response) => {
    const { serviceId, memberId } = req.params;
    const { agreetype, fileext } = req.body;
    
    console.log(`Evidence file upload for ${serviceId}/${memberId}`);
    
    // Validate file type and extension
    const validExtensions: Record<string, string[]> = {
      '1': ['jpg', 'jpeg', 'gif', 'tif', 'pdf'], // 서면
      '2': ['der'], // 공인전자서명
      '4': ['mp3', 'wav', 'wma'] // 녹취
    };
    
    if (!validExtensions[agreetype]?.includes(fileext)) {
      return res.json({
        resultCd: 'E006',
        resultMsg: '증빙구분 파일확장자 불일치'
      });
    }
    
    // Store evidence file info
    dataStore.storeEvidenceFile(serviceId, memberId, {
      agreetype,
      fileext,
      uploadDate: new Date().toISOString()
    });
    
    res.json({
      resultCd: '0000',
      resultMsg: '정상'
    });
  }
);

// Upload evidence file (Base64)
app.post('/thebill/retailers/:serviceId/members/:memberId/agree-enc',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId, memberId } = req.params;
    const { agreetype, fileext, encData }: EvidenceFileUploadRequest = req.body;
    
    console.log(`Evidence file upload (Base64) for ${serviceId}/${memberId}`);
    
    // Validate Base64 data size (300KB limit after encoding)
    if (encData && encData.length > 300 * 1024) {
      return res.json({
        resultCd: 'E202',
        resultMsg: '서면파일 최대사이즈 초과'
      });
    }
    
    dataStore.storeEvidenceFile(serviceId, memberId, {
      agreetype,
      fileext,
      uploadDate: new Date().toISOString(),
      isBase64: true
    });
    
    res.json({
      resultCd: '0000',
      resultMsg: '정상'
    });
  }
);

// Delete evidence file
app.delete('/thebill/retailers/:serviceId/members/:memberId/agreement',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId, memberId } = req.params;
    
    console.log(`Evidence file delete for ${serviceId}/${memberId}`);
    
    const deleted = dataStore.deleteEvidenceFile(serviceId, memberId);
    
    if (!deleted) {
      return res.json({
        resultCd: 'E301',
        resultMsg: '기등록 파일 없음'
      });
    }
    
    res.json({
      resultCd: '0000',
      resultMsg: '정상'
    });
  }
);

// ==================== Member Registration APIs ====================

// Register new member
app.post('/thebill/retailers/:serviceId/members/:memberId',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId, memberId } = req.params;
    const memberData: MemberRegistrationRequest = req.body;
    
    console.log(`Member registration for ${serviceId}/${memberId}`);
    
    // Check if member already exists
    if (dataStore.getMember(serviceId, memberId)) {
      return res.json({
        resultCd: '2002',
        resultMsg: '회원아이디 중복'
      });
    }
    
    // Validate required fields based on service type
    if (memberData.serviceCd === 'BANK') {
      if (!memberData.bankCd || !memberData.accountNo || !memberData.accountName || !memberData.idNo) {
        return res.json({
          resultCd: '7777',
          resultMsg: '연동 파라미터 오류'
        });
      }
    } else if (memberData.serviceCd === 'CARD') {
      if (!memberData.cardNo || !memberData.valYn) {
        return res.json({
          resultCd: '7777',
          resultMsg: '연동 파라미터 오류'
        });
      }
    }
    
    // Store member
    const bankSendDt = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    dataStore.storeMember(serviceId, memberId, {
      ...memberData,
      status: 0, // 등록대기
      regDt: bankSendDt,
      bankSendDt
    });
    
    const response: MemberRegistrationResponse = {
      resultCd: '0000',
      resultMsg: '정상',
      bankSendDt
    };
    
    res.json(response);
  }
);

// Get member info
app.get('/thebill/retailers/:serviceId/members/:memberId',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId, memberId } = req.params;
    
    console.log(`Member query for ${serviceId}/${memberId}`);
    
    const member = dataStore.getMember(serviceId, memberId);
    
    if (!member) {
      return res.json({
        resultCd: '3001',
        resultMsg: '미등록 회원'
      });
    }
    
    // Simulate member processing (change status after some time)
    const registrationTime = new Date(member.regDt).getTime();
    const currentTime = Date.now();
    const timeDiff = currentTime - registrationTime;
    
    // After 20 minutes in test mode, mark as successfully registered
    if (timeDiff > 20 * 60 * 1000 && member.status === 0) {
      member.status = 1; // 정상등록
      member.bankResultMsg = '정상 등록 완료';
      dataStore.updateMember(serviceId, memberId, member);
    }
    
    // Mask sensitive information
    const maskedMember: MemberInfo = {
      ...member,
      memberName: maskString(member.memberName, 1),
      accountNo: member.accountNo ? maskString(member.accountNo, 4) : undefined,
      accountName: member.accountName ? maskString(member.accountName, 1) : undefined,
      idNo: member.idNo ? maskString(member.idNo, 6) : undefined,
      cardNo: member.cardNo ? maskString(member.cardNo, 4) : undefined
    };
    
    const response: MemberRegistrationResponse = {
      resultCd: '0000',
      resultMsg: '정상',
      memberInfo: maskedMember
    };
    
    res.json(response);
  }
);

// Update member
app.post('/thebill/retailers/:serviceId/members/:memberId/modify',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId, memberId } = req.params;
    const updateData: Partial<MemberRegistrationRequest> = req.body;
    
    console.log(`Member update for ${serviceId}/${memberId}`);
    
    const member = dataStore.getMember(serviceId, memberId);
    
    if (!member) {
      return res.json({
        resultCd: '3001',
        resultMsg: '미등록 회원'
      });
    }
    
    // Only allow updating general info (not financial info)
    const allowedFields = ['memberName', 'hpNo', 'email', 'serviceName', 'userDefine'];
    const filteredUpdate = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {} as any);
    
    dataStore.updateMember(serviceId, memberId, filteredUpdate);
    
    res.json({
      resultCd: '0000',
      resultMsg: '정상'
    });
  }
);

// Delete member
app.delete('/thebill/retailers/:serviceId/members/:memberId',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId, memberId } = req.params;
    
    console.log(`Member deletion for ${serviceId}/${memberId}`);
    
    const member = dataStore.getMember(serviceId, memberId);
    
    if (!member) {
      return res.json({
        resultCd: '3001',
        resultMsg: '미등록 회원'
      });
    }
    
    if (member.status === 3) {
      return res.json({
        resultCd: '3005',
        resultMsg: '기 해지 회원'
      });
    }
    
    // Mark as cancelled
    member.status = 3;
    member.stopDt = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    dataStore.updateMember(serviceId, memberId, member);
    
    res.json({
      resultCd: '0000',
      resultMsg: '정상'
    });
  }
);

// ==================== Payment/Withdrawal APIs ====================

// Create payment/withdrawal request
app.post('/thebill/retailers/:serviceId/payments/:withdrawalDate/:messageNo',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId, withdrawalDate, messageNo } = req.params;
    const paymentData: PaymentRequest = req.body;
    
    console.log(`Payment request for ${serviceId}/${withdrawalDate}/${messageNo}`);
    
    // Check if member exists and is active
    const member = dataStore.getMember(serviceId, paymentData.memberId);
    if (!member) {
      return res.json({
        resultCd: '2001',
        resultMsg: '회원아이디 오류'
      });
    }
    
    if (member.status !== 1) {
      return res.json({
        resultCd: '2002',
        resultMsg: '회원상태 체크 - 정상 등록 회원 아님'
      });
    }
    
    // Check for duplicate payment
    if (dataStore.getPayment(serviceId, withdrawalDate, messageNo)) {
      return res.json({
        resultCd: '2018',
        resultMsg: '연번 중복'
      });
    }
    
    // Store payment request
    dataStore.storePayment(serviceId, withdrawalDate, messageNo, {
      ...paymentData,
      status: 0, // 출금등록대기
      sendDt: withdrawalDate,
      messageNo,
      registrationTime: new Date().toISOString()
    });
    
    res.json({
      resultCd: '0000',
      resultMsg: '정상'
    });
  }
);

// Get payment info
app.get('/thebill/retailers/:serviceId/payments/:withdrawalDate/:messageNo',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId, withdrawalDate, messageNo } = req.params;
    
    console.log(`Payment query for ${serviceId}/${withdrawalDate}/${messageNo}`);
    
    const payment = dataStore.getPayment(serviceId, withdrawalDate, messageNo);
    
    if (!payment) {
      return res.json({
        resultCd: '2021',
        resultMsg: '출금건 없음'
      });
    }
    
    // Simulate payment processing
    const registrationTime = new Date(payment.registrationTime).getTime();
    const currentTime = Date.now();
    const timeDiff = currentTime - registrationTime;
    
    // After 20 minutes in test mode, mark as successful
    if (timeDiff > 20 * 60 * 1000 && payment.status === 0) {
      payment.status = 1; // 출금성공
      payment.bankResultMsg = '정상 출금 완료';
      payment.bankResultCd = '0000';
      
      // Add card-specific fields if CARD service
      if (payment.serviceCd === 'CARD') {
        payment.appDt = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        payment.appNo = Math.random().toString().slice(2, 10);
      }
      
      // Calculate fee
      payment.fee = (parseInt(payment.reqAmt) * 0.01).toFixed(0);
      
      dataStore.updatePayment(serviceId, withdrawalDate, messageNo, payment);
    }
    
    // Mask sensitive information
    const maskedPayment: PaymentInfo = {
      ...payment,
      memberName: maskString(payment.memberName, 1)
    };
    
    const response: PaymentResponse = {
      resultCd: '0000',
      resultMsg: '정상',
      payInfo: maskedPayment
    };
    
    res.json(response);
  }
);

// Delete pending payment
app.delete('/thebill/retailers/:serviceId/payments/:withdrawalDate/:messageNo',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId, withdrawalDate, messageNo } = req.params;
    
    console.log(`Payment deletion for ${serviceId}/${withdrawalDate}/${messageNo}`);
    
    const payment = dataStore.getPayment(serviceId, withdrawalDate, messageNo);
    
    if (!payment) {
      return res.json({
        resultCd: '2019',
        resultMsg: '삭제 대상건 없음'
      });
    }
    
    if (payment.status !== 0) {
      return res.json({
        resultCd: '2020',
        resultMsg: '삭제 대상 아님 - 대기상태 건이 아닌 출금 진행중인건'
      });
    }
    
    dataStore.deletePayment(serviceId, withdrawalDate, messageNo);
    
    res.json({
      resultCd: '0000',
      resultMsg: '정상'
    });
  }
);

// Cancel card payment
app.post('/thebill/retailers/:serviceId/payments/:originalDate/:originalMessageNo/cancel',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId, originalDate, originalMessageNo } = req.params;
    const { cancelDt } = req.body;
    
    console.log(`Payment cancellation for ${serviceId}/${originalDate}/${originalMessageNo}`);
    
    const payment = dataStore.getPayment(serviceId, originalDate, originalMessageNo);
    
    if (!payment) {
      return res.json({
        resultCd: '2021',
        resultMsg: '출금건 없음'
      });
    }
    
    if (payment.serviceCd !== 'CARD') {
      return res.json({
        resultCd: '2024',
        resultMsg: '취소 대상건 아님 - 카드 출금건이 아닌 대상'
      });
    }
    
    if (payment.status !== 1) {
      return res.json({
        resultCd: '2025',
        resultMsg: '출금 대기 또는 실패건 취소 불가'
      });
    }
    
    // Mark as cancellation in progress
    payment.status = 3; // 취소요청중
    payment.cancelDt = cancelDt;
    dataStore.updatePayment(serviceId, originalDate, originalMessageNo, payment);
    
    res.json({
      resultCd: '0000',
      resultMsg: '정상'
    });
  }
);

// ==================== Settlement Status API ====================

app.get('/thebill/retailers/:serviceId/settlements/due-date',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    const { sendDt, serviceCd } = req.query;
    
    console.log(`Settlement status query for ${serviceId} on ${sendDt}`);
    
    if (!sendDt || !serviceCd) {
      return res.json({
        resultCd: '7777',
        resultMsg: '연동 파라미터 오류'
      });
    }
    
    // Calculate settlement date based on business rules
    const settlementInfo = settlementCalendar.calculateSettlementDate(
      sendDt as string,
      serviceCd as ServiceCode
    );
    
    const response: SettlementStatusResponse = {
      resultCd: '0000',
      resultMsg: '정상',
      settleDt: settlementInfo.settleDt,
      settleSt: 1, // 정산완료 (for mock)
      realSettleDt: serviceCd === 'BANK' ? settlementInfo.realSettleDt : undefined
    };
    
    res.json(response);
  }
);

// ==================== Change/Cancellation History API ====================

app.get('/thebill/retailers/:serviceId/members',
  validateApiKey,
  async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    const { status, searchDt } = req.query;
    
    console.log(`Change history query for ${serviceId} on ${searchDt}`);
    
    if (!status || !searchDt) {
      return res.json({
        resultCd: '7777',
        resultMsg: '연동 파라미터 오류'
      });
    }
    
    // Mock response for change history
    const mockHistory: ChangeHistoryResponse[] = [
      {
        serviceId,
        status: status as "C" | "D",
        causeType: status === 'C' ? '1' : undefined,
        memberCd: 'mem' + Math.random().toString().slice(2, 11),
        oldBankCd: '011',
        oldAccountNo: '12345678901234',
        newBankCd: status === 'C' ? '020' : undefined,
        newAccountNo: status === 'C' ? '98765432109876' : undefined
      }
    ];
    
    res.json(mockHistory);
  }
);

// ==================== Utility Functions ====================

function maskString(str: string, visibleChars: number): string {
  if (!str || str.length <= visibleChars) return str;
  const masked = str.slice(0, visibleChars) + '*'.repeat(str.length - visibleChars);
  return masked;
}

// ==================== Server Startup ====================

const PORT = process.env.MOCK_SERVER_PORT || 7080;

export function startMockServer() {
  app.listen(PORT, () => {
    console.log(`NICEPAY Mock Server running on port ${PORT}`);
    console.log(`Test environment URL: http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  - Evidence Files: /thebill/retailers/:serviceId/members/:memberId/agree');
    console.log('  - Member Registration: /thebill/retailers/:serviceId/members/:memberId');
    console.log('  - Payments: /thebill/retailers/:serviceId/payments/:date/:messageNo');
    console.log('  - Settlements: /thebill/retailers/:serviceId/settlements/due-date');
  });
}

// Start server if run directly
if (require.main === module) {
  startMockServer();
}