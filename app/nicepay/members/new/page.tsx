'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NicepayClient } from '@/services/nicepay-client';
import { NicepayConfig, BANK_CODES } from '@/types/nicepay.types';

const config: NicepayConfig = {
  serviceId: '30000000',
  apiKey: 'test-api-key-123',
  environment: 'test',
  urls: {
    base: 'localhost',
    port: 7080
  }
};

const client = new NicepayClient(config);

export default function NewMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState<'BANK' | 'CARD'>('BANK');
  const [formData, setFormData] = useState({
    memberId: '',
    memberName: '',
    hpNo: '',
    email: '',
    serviceName: '',
    // Bank fields
    bankCd: '004',
    accountNo: '',
    accountName: '',
    idNo: '',
    // Card fields
    cardNo: '',
    valYn: '',
    // Cash receipt fields
    cusType: '',
    cusOffNo: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestData: any = {
        memberName: formData.memberName,
        serviceCd: serviceType,
        hpNo: formData.hpNo,
        email: formData.email || undefined,
        serviceName: formData.serviceName || undefined
      };

      if (serviceType === 'BANK') {
        requestData.bankCd = formData.bankCd;
        requestData.accountNo = formData.accountNo;
        requestData.accountName = formData.accountName;
        requestData.idNo = formData.idNo;
      } else {
        requestData.cardNo = formData.cardNo;
        requestData.valYn = formData.valYn;
      }

      if (formData.cusType) {
        requestData.cusType = parseInt(formData.cusType);
        requestData.cusOffNo = formData.cusOffNo;
      }

      const response = await client.registerMember(formData.memberId, requestData);
      
      if (response.resultCd === '0000') {
        alert('회원이 성공적으로 등록되었습니다.');
        router.push('/nicepay/members');
      } else {
        alert(`등록 실패: ${response.resultMsg}`);
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      alert(`등록 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">새 회원 등록</h2>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-6 py-8 rounded-lg">
        {/* Service Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            서비스 타입
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setServiceType('BANK')}
              className={`px-4 py-2 rounded-md ${
                serviceType === 'BANK'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              계좌 출금
            </button>
            <button
              type="button"
              onClick={() => setServiceType('CARD')}
              className={`px-4 py-2 rounded-md ${
                serviceType === 'CARD'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              카드 결제
            </button>
          </div>
        </div>

        {/* Common Fields */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="memberId" className="block text-sm font-medium text-gray-700">
              회원 ID *
            </label>
            <input
              type="text"
              name="memberId"
              id="memberId"
              required
              maxLength={20}
              value={formData.memberId}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="member_001"
            />
          </div>

          <div>
            <label htmlFor="memberName" className="block text-sm font-medium text-gray-700">
              회원명 *
            </label>
            <input
              type="text"
              name="memberName"
              id="memberName"
              required
              maxLength={20}
              value={formData.memberName}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="hpNo" className="block text-sm font-medium text-gray-700">
              휴대폰 번호 *
            </label>
            <input
              type="tel"
              name="hpNo"
              id="hpNo"
              required
              value={formData.hpNo}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="01012345678"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700">
              서비스명
            </label>
            <input
              type="text"
              name="serviceName"
              id="serviceName"
              value={formData.serviceName}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="월간 구독 서비스"
            />
          </div>
        </div>

        {/* Bank-specific Fields */}
        {serviceType === 'BANK' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 border-t pt-6">
            <div>
              <label htmlFor="bankCd" className="block text-sm font-medium text-gray-700">
                은행 *
              </label>
              <select
                name="bankCd"
                id="bankCd"
                required
                value={formData.bankCd}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {Object.entries(BANK_CODES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="accountNo" className="block text-sm font-medium text-gray-700">
                계좌번호 *
              </label>
              <input
                type="text"
                name="accountNo"
                id="accountNo"
                required
                maxLength={16}
                value={formData.accountNo}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-gray-700">
                예금주명 *
              </label>
              <input
                type="text"
                name="accountName"
                id="accountName"
                required
                maxLength={20}
                value={formData.accountName}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="idNo" className="block text-sm font-medium text-gray-700">
                생년월일/사업자번호 *
              </label>
              <input
                type="text"
                name="idNo"
                id="idNo"
                required
                maxLength={10}
                value={formData.idNo}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="900101 또는 1234567890"
              />
            </div>
          </div>
        )}

        {/* Card-specific Fields */}
        {serviceType === 'CARD' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 border-t pt-6">
            <div>
              <label htmlFor="cardNo" className="block text-sm font-medium text-gray-700">
                카드번호 *
              </label>
              <input
                type="text"
                name="cardNo"
                id="cardNo"
                required
                maxLength={16}
                value={formData.cardNo}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="1234567890123456"
              />
            </div>

            <div>
              <label htmlFor="valYn" className="block text-sm font-medium text-gray-700">
                유효기간 (YYMM) *
              </label>
              <input
                type="text"
                name="valYn"
                id="valYn"
                required
                maxLength={4}
                value={formData.valYn}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="2512"
              />
            </div>
          </div>
        )}

        {/* Cash Receipt Fields */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 border-t pt-6">
          <div>
            <label htmlFor="cusType" className="block text-sm font-medium text-gray-700">
              현금영수증 타입
            </label>
            <select
              name="cusType"
              id="cusType"
              value={formData.cusType}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">선택안함</option>
              <option value="1">소득공제</option>
              <option value="2">지출증빙</option>
            </select>
          </div>

          {formData.cusType && (
            <div>
              <label htmlFor="cusOffNo" className="block text-sm font-medium text-gray-700">
                현금영수증 번호
              </label>
              <input
                type="text"
                name="cusOffNo"
                id="cusOffNo"
                value={formData.cusOffNo}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={formData.cusType === '1' ? '휴대폰번호' : '사업자번호'}
              />
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/nicepay/members')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '등록 중...' : '회원 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}