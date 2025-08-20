/**
 * NICEPAY CMS API Client
 * Client SDK for interacting with NICEPAY CMS API (both mock and production)
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import {
  NicepayConfig,
  BaseResponse,
  MemberRegistrationRequest,
  MemberRegistrationResponse,
  PaymentRequest,
  PaymentResponse,
  SettlementStatusResponse,
  ChangeHistoryResponse,
  EvidenceFileUploadRequest,
  ServiceCode,
  NICEPAY_ENVIRONMENTS
} from '../types/nicepay.types';

export class NicepayClient {
  private client: AxiosInstance;
  private config: NicepayConfig;
  
  constructor(config: NicepayConfig) {
    this.config = config;
    
    // Use local mock API for test environment
    const baseURL = config.environment === 'test' 
      ? 'http://localhost:3000/api/mock'
      : `https://${NICEPAY_ENVIRONMENTS[config.environment].base}:${NICEPAY_ENVIRONMENTS[config.environment].port}`;
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Api-Key': config.apiKey,
        'Service-Type': 'B',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[NICEPAY] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[NICEPAY] Request error:', error);
        return Promise.reject(error);
      }
    );
    
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[NICEPAY] Response:`, response.data);
        return response;
      },
      (error) => {
        console.error('[NICEPAY] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }
  
  // ==================== Evidence File APIs ====================
  
  /**
   * Upload evidence file (multipart/form-data)
   */
  async uploadEvidenceFile(
    memberId: string,
    file: Buffer,
    options: {
      agreetype: string;
      fileext: string;
      filename: string;
    }
  ): Promise<BaseResponse> {
    const formData = new FormData();
    formData.append('agreetype', options.agreetype);
    formData.append('fileext', options.fileext);
    formData.append('filename', file, {
      filename: options.filename,
      contentType: this.getContentType(options.fileext)
    });
    
    const response = await this.client.post(
      `/thebill/retailers/${this.config.serviceId}/members/${memberId}/agree`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        }
      }
    );
    
    return response.data;
  }
  
  /**
   * Upload evidence file (Base64)
   */
  async uploadEvidenceFileBase64(
    memberId: string,
    data: EvidenceFileUploadRequest
  ): Promise<BaseResponse> {
    const response = await this.client.post(
      `/thebill/retailers/${this.config.serviceId}/members/${memberId}/agree-enc`,
      data
    );
    
    return response.data;
  }
  
  /**
   * Delete evidence file
   */
  async deleteEvidenceFile(memberId: string): Promise<BaseResponse> {
    const response = await this.client.delete(
      `/thebill/retailers/${this.config.serviceId}/members/${memberId}/agreement`
    );
    
    return response.data;
  }
  
  // ==================== Member Registration APIs ====================
  
  /**
   * Register new member
   */
  async registerMember(
    memberId: string,
    data: MemberRegistrationRequest
  ): Promise<MemberRegistrationResponse> {
    const response = await this.client.post(
      `/thebill/retailers/${this.config.serviceId}/members/${memberId}`,
      data
    );
    
    return response.data;
  }
  
  /**
   * Get member information
   */
  async getMember(memberId: string): Promise<MemberRegistrationResponse> {
    const response = await this.client.get(
      `/thebill/retailers/${this.config.serviceId}/members/${memberId}`
    );
    
    return response.data;
  }
  
  /**
   * Update member information
   */
  async updateMember(
    memberId: string,
    data: Partial<MemberRegistrationRequest>
  ): Promise<BaseResponse> {
    const response = await this.client.post(
      `/thebill/retailers/${this.config.serviceId}/members/${memberId}/modify`,
      data
    );
    
    return response.data;
  }
  
  /**
   * Delete/Cancel member
   */
  async deleteMember(memberId: string): Promise<BaseResponse> {
    const response = await this.client.delete(
      `/thebill/retailers/${this.config.serviceId}/members/${memberId}`
    );
    
    return response.data;
  }
  
  // ==================== Payment/Withdrawal APIs ====================
  
  /**
   * Create payment/withdrawal request
   */
  async createPayment(
    withdrawalDate: string,
    messageNo: string,
    data: PaymentRequest
  ): Promise<BaseResponse> {
    const response = await this.client.post(
      `/thebill/retailers/${this.config.serviceId}/payments/${withdrawalDate}/${messageNo}`,
      data
    );
    
    return response.data;
  }
  
  /**
   * Get payment information
   */
  async getPayment(
    withdrawalDate: string,
    messageNo: string
  ): Promise<PaymentResponse> {
    const response = await this.client.get(
      `/thebill/retailers/${this.config.serviceId}/payments/${withdrawalDate}/${messageNo}`
    );
    
    return response.data;
  }
  
  /**
   * Delete pending payment
   */
  async deletePayment(
    withdrawalDate: string,
    messageNo: string
  ): Promise<BaseResponse> {
    const response = await this.client.delete(
      `/thebill/retailers/${this.config.serviceId}/payments/${withdrawalDate}/${messageNo}`
    );
    
    return response.data;
  }
  
  /**
   * Cancel card payment
   */
  async cancelCardPayment(
    originalDate: string,
    originalMessageNo: string,
    cancelDate: string
  ): Promise<BaseResponse> {
    const response = await this.client.post(
      `/thebill/retailers/${this.config.serviceId}/payments/${originalDate}/${originalMessageNo}/cancel`,
      { cancelDt: cancelDate }
    );
    
    return response.data;
  }
  
  // ==================== Settlement APIs ====================
  
  /**
   * Get settlement status
   */
  async getSettlementStatus(
    withdrawalDate: string,
    serviceCd: ServiceCode
  ): Promise<SettlementStatusResponse> {
    const response = await this.client.get(
      `/thebill/retailers/${this.config.serviceId}/settlements/due-date`,
      {
        params: {
          sendDt: withdrawalDate,
          serviceCd
        }
      }
    );
    
    return response.data;
  }
  
  // ==================== Change History APIs ====================
  
  /**
   * Get member change/cancellation history
   */
  async getChangeHistory(
    status: 'C' | 'D',
    searchDate: string
  ): Promise<ChangeHistoryResponse[]> {
    const response = await this.client.get(
      `/thebill/retailers/${this.config.serviceId}/members`,
      {
        params: {
          status,
          searchDt: searchDate
        }
      }
    );
    
    return response.data;
  }
  
  // ==================== Utility Methods ====================
  
  /**
   * Format date as YYYYMMDD
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  
  /**
   * Generate message number
   */
  generateMessageNo(sequence: number): string {
    return String(sequence).padStart(6, '0');
  }
  
  /**
   * Get content type for file extension
   */
  private getContentType(fileext: string): string {
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'tif': 'image/tiff',
      'pdf': 'application/pdf',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'wma': 'audio/x-ms-wma',
      'der': 'application/x-x509-ca-cert'
    };
    
    return contentTypes[fileext] || 'application/octet-stream';
  }
  
  /**
   * Validate member data
   */
  validateMemberData(data: MemberRegistrationRequest): string[] {
    const errors: string[] = [];
    
    if (!data.memberName || data.memberName.length > 20) {
      errors.push('Member name is required and must be <= 20 characters');
    }
    
    if (!data.serviceCd || !['BANK', 'CARD'].includes(data.serviceCd)) {
      errors.push('Service code must be BANK or CARD');
    }
    
    if (data.serviceCd === 'BANK') {
      if (!data.bankCd) errors.push('Bank code is required for BANK service');
      if (!data.accountNo) errors.push('Account number is required for BANK service');
      if (!data.accountName) errors.push('Account name is required for BANK service');
      if (!data.idNo) errors.push('ID number is required for BANK service');
    }
    
    if (data.serviceCd === 'CARD') {
      if (!data.cardNo) errors.push('Card number is required for CARD service');
      if (!data.valYn) errors.push('Card expiry date is required for CARD service');
    }
    
    if (!data.hpNo) {
      errors.push('Phone number is required');
    }
    
    return errors;
  }
  
  /**
   * Validate payment data
   */
  validatePaymentData(data: PaymentRequest): string[] {
    const errors: string[] = [];
    
    if (!data.memberId || data.memberId.length > 20) {
      errors.push('Member ID is required and must be <= 20 characters');
    }
    
    if (!data.memberName || data.memberName.length > 20) {
      errors.push('Member name is required and must be <= 20 characters');
    }
    
    if (!data.reqAmt || isNaN(Number(data.reqAmt)) || Number(data.reqAmt) <= 0) {
      errors.push('Request amount must be a positive number');
    }
    
    if (!data.serviceCd || !['BANK', 'CARD'].includes(data.serviceCd)) {
      errors.push('Service code must be BANK or CARD');
    }
    
    if (data.workType === 'C' && !data.cancelDt) {
      errors.push('Cancel date is required for cancellation');
    }
    
    return errors;
  }
}