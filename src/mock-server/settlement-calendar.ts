/**
 * Settlement Calendar for NICEPAY CMS
 * Handles business day calculations and settlement date logic
 */

import { ServiceCode } from '../types/nicepay.types';

export class SettlementCalendar {
  // Korean holidays for 2024-2025 (should be updated yearly)
  private holidays: Set<string> = new Set([
    // 2024
    '2024-01-01', // 신정
    '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12', // 설날 연휴
    '2024-03-01', // 삼일절
    '2024-04-10', // 국회의원 선거일
    '2024-05-05', // 어린이날
    '2024-05-06', // 어린이날 대체휴일
    '2024-05-15', // 부처님오신날
    '2024-06-06', // 현충일
    '2024-08-15', // 광복절
    '2024-09-16', '2024-09-17', '2024-09-18', // 추석 연휴
    '2024-10-03', // 개천절
    '2024-10-09', // 한글날
    '2024-12-25', // 성탄절
    
    // 2025
    '2025-01-01', // 신정
    '2025-01-28', '2025-01-29', '2025-01-30', // 설날 연휴
    '2025-03-01', // 삼일절
    '2025-05-05', // 어린이날
    '2025-05-06', // 부처님오신날
    '2025-06-06', // 현충일
    '2025-08-15', // 광복절
    '2025-10-03', // 개천절
    '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', // 추석 연휴
    '2025-10-09', // 한글날
    '2025-12-25', // 성탄절
  ]);
  
  /**
   * Check if a date is a business day (not weekend or holiday)
   */
  isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    const dateString = this.formatDate(date);
    
    // Check if weekend (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Check if holiday
    if (this.holidays.has(dateString)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get the next business day from a given date
   */
  getNextBusinessDay(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    while (!this.isBusinessDay(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay;
  }
  
  /**
   * Get the previous business day from a given date
   */
  getPreviousBusinessDay(date: Date): Date {
    const prevDay = new Date(date);
    prevDay.setDate(prevDay.getDate() - 1);
    
    while (!this.isBusinessDay(prevDay)) {
      prevDay.setDate(prevDay.getDate() - 1);
    }
    
    return prevDay;
  }
  
  /**
   * Add business days to a date
   */
  addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let daysAdded = 0;
    
    while (daysAdded < days) {
      result.setDate(result.getDate() + 1);
      if (this.isBusinessDay(result)) {
        daysAdded++;
      }
    }
    
    return result;
  }
  
  /**
   * Format date as YYYYMMDD string
   */
  formatDateYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  
  /**
   * Format date as YYYY-MM-DD string
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Parse YYYYMMDD string to Date
   */
  parseYYYYMMDD(dateStr: string): Date {
    const year = parseInt(dateStr.substr(0, 4));
    const month = parseInt(dateStr.substr(4, 2)) - 1;
    const day = parseInt(dateStr.substr(6, 2));
    return new Date(year, month, day);
  }
  
  /**
   * Calculate settlement date based on withdrawal date and service type
   */
  calculateSettlementDate(withdrawalDate: string, serviceCd: ServiceCode): {
    settleDt: string;
    realSettleDt?: string;
  } {
    const withdrawalDt = this.parseYYYYMMDD(withdrawalDate);
    
    // For test environment, simulate faster processing
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_MODE === 'test';
    
    if (isTestMode) {
      // In test mode, settlement is same day
      return {
        settleDt: withdrawalDate,
        realSettleDt: withdrawalDate
      };
    }
    
    // Production logic
    let settlementDate: Date;
    
    if (serviceCd === 'BANK') {
      // Bank withdrawals: D+2 business days for settlement
      settlementDate = this.addBusinessDays(withdrawalDt, 2);
    } else {
      // Card payments: D+1 business day for settlement
      settlementDate = this.addBusinessDays(withdrawalDt, 1);
    }
    
    const result: any = {
      settleDt: this.formatDateYYYYMMDD(settlementDate)
    };
    
    // For BANK, also provide real settlement date
    if (serviceCd === 'BANK') {
      result.realSettleDt = result.settleDt;
    }
    
    return result;
  }
  
  /**
   * Check if a withdrawal registration is within allowed time
   */
  isWithinRegistrationTime(withdrawalDate: string): {
    allowed: boolean;
    message?: string;
  } {
    const now = new Date();
    const currentHour = now.getHours();
    const withdrawalDt = this.parseYYYYMMDD(withdrawalDate);
    
    // Must register before 17:00 on D-1 business day
    const requiredRegistrationDate = this.getPreviousBusinessDay(withdrawalDt);
    
    // Check if today is the required registration date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requiredRegistrationDate.setHours(0, 0, 0, 0);
    
    if (today.getTime() === requiredRegistrationDate.getTime()) {
      // Same day - check time
      if (currentHour >= 17) {
        return {
          allowed: false,
          message: '출금 등록시간 경과 (17시 이후)'
        };
      }
    } else if (today.getTime() > requiredRegistrationDate.getTime()) {
      // Past the registration date
      return {
        allowed: false,
        message: '출금 등록일자 경과'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check if member registration is within allowed time
   */
  isMemberRegistrationAllowed(): {
    allowed: boolean;
    message?: string;
  } {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Must register before 12:00 for same-day processing
    if (currentHour >= 12) {
      return {
        allowed: true, // Still allowed but will be processed next business day
        message: '12시 이후 등록 - 다음 영업일 처리'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Calculate when results will be available
   */
  calculateResultAvailableTime(requestDate: Date, requestType: 'member' | 'payment', serviceCd?: ServiceCode): {
    availableDate: Date;
    availableTime: string;
  } {
    let resultDate: Date;
    
    if (requestType === 'member') {
      // Member registration results: next business day at 13:00
      resultDate = this.getNextBusinessDay(requestDate);
    } else {
      // Payment results
      if (serviceCd === 'BANK') {
        // Bank: D+1 business day at 13:00
        resultDate = this.getNextBusinessDay(requestDate);
      } else {
        // Card: Same day for approval status, D+1 for fees
        resultDate = requestDate;
      }
    }
    
    return {
      availableDate: resultDate,
      availableTime: '13:00'
    };
  }
  
  /**
   * Generate settlement calendar for a month
   */
  generateMonthlyCalendar(year: number, month: number): {
    date: string;
    isBusinessDay: boolean;
    withdrawalDeadline?: string;
    settlementDate?: string;
  }[] {
    const calendar = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = this.formatDate(date);
      const isBusinessDay = this.isBusinessDay(date);
      
      const entry: any = {
        date: dateStr,
        isBusinessDay
      };
      
      if (isBusinessDay) {
        // Calculate withdrawal deadline (D-1 17:00)
        const withdrawalDeadlineDate = this.getPreviousBusinessDay(date);
        entry.withdrawalDeadline = this.formatDate(withdrawalDeadlineDate) + ' 17:00';
        
        // Calculate settlement dates
        const dateYYYYMMDD = this.formatDateYYYYMMDD(date);
        const bankSettlement = this.calculateSettlementDate(dateYYYYMMDD, 'BANK');
        const cardSettlement = this.calculateSettlementDate(dateYYYYMMDD, 'CARD');
        
        entry.settlementDate = {
          bank: this.parseYYYYMMDD(bankSettlement.settleDt),
          card: this.parseYYYYMMDD(cardSettlement.settleDt)
        };
      }
      
      calendar.push(entry);
    }
    
    return calendar;
  }
}