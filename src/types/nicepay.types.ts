/**
 * NICEPAY CMS API Data Models
 * Based on NICEPAY CMS API Document Ver.2.0.5
 */

// ==================== Common Types ====================

export interface BaseResponse {
  resultCd: string;  // 결과 코드 (예: "0000")
  resultMsg: string; // 결과 메시지 (예: "정상")
}

export type ServiceCode = "BANK" | "CARD";
export type MemberStatus = 0 | 1 | 2 | 3; // 0: 등록대기, 1: 정상등록, 2: 등록실패, 3: 해지
export type PaymentStatus = 0 | 1 | 2 | 3 | 4; // 0: 출금등록대기, 1: 출금성공, 2: 출금실패, 3: 취소요청중, 4: 취소요청성공
export type SettlementStatus = 0 | 1 | 6 | 7 | 8 | 9; // 0: 정산대기, 1: 정산완료, 6: 휴폐업중지, 7: 지급중지, 8: 한도초과, 9: 수수료미정산
export type EvidenceType = "1" | "2" | "4"; // 1: 서면, 2: 공인전자서명, 4: 녹취
export type CashReceiptType = 1 | 2; // 1: 소득공제, 2: 지출증빙
export type WorkType = "N" | "C"; // N: 출금신청, C: 카드 승인취소

// ==================== Evidence File API ====================

export interface EvidenceFileUploadRequest {
  agreetype: EvidenceType;
  fileext: string; // jpg, jpeg, gif, tif, pdf, der, mp3, wav, wma
  filename?: string; // multipart/form-data 전송 시
  encData?: string; // Base64 전송 시
}

export interface EvidenceFileResponse extends BaseResponse {}

// ==================== Member Registration API ====================

export interface MemberRegistrationRequest {
  memberName: string;      // 회원 성명 (최대 20 bytes)
  serviceCd: ServiceCode;  // 서비스코드
  bankCd?: string;         // 은행 코드 (BANK인 경우 필수)
  accountNo?: string;      // 출금계좌 번호 (BANK인 경우 필수)
  accountName?: string;    // 출금계좌 예금주 성명 (BANK인 경우 필수)
  idNo?: string;          // 생년월일 앞 6자리 또는 사업자번호 10자리 (BANK인 경우 필수)
  hpNo: string;           // 회원 휴대폰 번호
  email?: string;         // 이메일 주소
  serviceName?: string;   // 상품명/서비스명
  cardNo?: string;        // 카드 번호 (CARD인 경우 필수)
  valYn?: string;         // 카드 유효기간 YYMM (CARD인 경우 필수)
  cusType?: CashReceiptType;  // 현금영수증 발행타입
  cusOffNo?: string;      // 현금영수증 발행 시 인증번호
  userDefine?: string;    // 사용자정의 필드
}

export interface MemberRegistrationResponse extends BaseResponse {
  bankSendDt?: string;    // 신규회원 등록일자 (YYYYMMDD)
  memberInfo?: MemberInfo; // 회원 조회 결과 (조회 시에만)
}

export interface MemberInfo {
  status: MemberStatus;
  bankResultMsg: string;
  regDt: string;          // 회원등록일자
  bankSendDt: string;     // 은행등록일자
  stopDt?: string;        // 회원해지일자
  memberName: string;     // 회원 성명 (마스킹)
  serviceCd: ServiceCode;
  bankCd?: string;
  accountNo?: string;     // 출금계좌 번호 (마스킹)
  accountName?: string;   // 출금계좌 예금주 성명 (마스킹)
  idNo?: string;         // 생년월일/사업자번호 (마스킹)
  hpNo: string;
  email?: string;
  serviceName?: string;
  cardNo?: string;        // 카드 번호 (마스킹)
  valYn?: string;
  cusType?: CashReceiptType;
  cusOffNo?: string;
  userDefine?: string;
}

// ==================== Payment/Withdrawal API ====================

export interface PaymentRequest {
  memberId: string;       // 회원아이디
  memberName: string;     // 회원명
  accountDesc?: string;   // 월, 회차 표시
  reqAmt: string;        // 출금 요청 금액
  cashRcpYn?: "Y" | "N"; // 현금영수증 발행 여부 (기본: Y)
  serviceCd: ServiceCode;
  userDefine?: string;
  workType?: WorkType;
  cancelDt?: string;      // 취소 요청일 (workType이 'C'인 경우 필수)
  divItemList?: DivisionItem[]; // 다계좌 분할입금 정보
}

export interface DivisionItem {
  itemCd: string;  // 분할계좌 항목 코드
  dealWon: string; // 분할계좌 입금 금액
}

export interface PaymentResponse extends BaseResponse {
  payInfo?: PaymentInfo; // 출금 조회 시에만 응답
}

export interface PaymentInfo {
  sendDt: string;         // 출금일
  bankResultCd?: string;  // 은행 등록 결과 코드
  bankResultMsg: string;  // 은행 등록 결과 메시지
  status: PaymentStatus;
  messageNo: string;      // 은행등록일자
  memberName: string;     // 회원 성명 (마스킹)
  accountDesc?: string;
  reqAmt: string;        // 출금(승인) 금액
  cashRcpYn: "Y" | "N";
  serviceCd: ServiceCode;
  appDt?: string;        // 카드 승인일자
  appNo?: string;        // 카드 승인번호
  cancelDt?: string;     // 카드 취소 요청일
  userDefine?: string;
  fee?: string;          // 수수료
}

// ==================== Settlement Status API ====================

export interface SettlementStatusResponse extends BaseResponse {
  settleDt?: string;      // 정산 예정일 (YYYYMMDD)
  settleSt?: SettlementStatus; // 실제 정산 상태
  realSettleDt?: string;  // 실제 정산일 (YYYYMMDD) - BANK인 경우에만
}

// ==================== Change/Cancellation History API ====================

export interface ChangeHistoryResponse {
  serviceId: string;      // 이용기관코드
  status: "C" | "D";      // C: 변경, D: 해지
  causeType?: "1" | "4";  // 1: 은행, 4: 통합관리시스템 (status가 'C'인 경우)
  memberCd: string;       // 회원번호
  oldBankCd: string;      // 변경 전 은행코드
  oldAccountNo: string;   // 변경 전 계좌번호
  newBankCd?: string;     // 변경 후 은행코드 (status가 'C'인 경우)
  newAccountNo?: string;  // 변경 후 계좌번호 (status가 'C'인 경우)
}

// ==================== Bank Codes ====================

export const BANK_CODES = {
  "002": "산업은행",
  "003": "기업은행",
  "004": "국민은행",
  "005": "외환은행",
  "007": "수협",
  "011": "농협",
  "020": "우리은행",
  "023": "제일은행",
  "027": "씨티은행",
  "031": "대구은행",
  "032": "부산은행",
  "034": "광주은행",
  "035": "제주은행",
  "037": "전북은행",
  "039": "경남은행",
  "045": "새마을금고",
  "048": "신협",
  "071": "우체국",
  "081": "하나은행",
  "088": "신한은행",
  "089": "케이뱅크",
  "090": "카카오뱅크",
  "092": "토스뱅크"
} as const;

export type BankCode = keyof typeof BANK_CODES;

// ==================== API Configuration ====================

export interface NicepayConfig {
  serviceId: string;      // 이용기관코드 (8자리)
  apiKey: string;         // API Key
  environment: "test" | "production";
  urls: {
    base: string;
    port: number;
  };
}

export const NICEPAY_ENVIRONMENTS = {
  test: {
    base: "rest-test.thebill.co.kr",
    port: 7080
  },
  production: {
    base: "rest.thebill.co.kr",
    port: 4435
  }
} as const;

// ==================== Business Rules ====================

export interface BusinessDayRules {
  memberRegistration: {
    cutoffTime: string; // "12:00"
    processingDays: number; // 1 영업일
    resultAvailableTime: string; // "13:00"
  };
  withdrawal: {
    registrationCutoffTime: string; // "17:00"
    daysBeforeWithdrawal: number; // D-1
    resultAvailableTime: string; // "13:00"
    resultAvailableDays: number; // D+1 for bank, D+0 for card
  };
}

export const BUSINESS_RULES: BusinessDayRules = {
  memberRegistration: {
    cutoffTime: "12:00",
    processingDays: 1,
    resultAvailableTime: "13:00"
  },
  withdrawal: {
    registrationCutoffTime: "17:00",
    daysBeforeWithdrawal: 1,
    resultAvailableTime: "13:00",
    resultAvailableDays: 1
  }
};