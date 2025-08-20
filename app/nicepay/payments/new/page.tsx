'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NicepayClient } from '@/services/nicepay-client';
import { NicepayConfig } from '@/types/nicepay.types';

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

export default function NewPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [formData, setFormData] = useState({
    memberId: '',
    memberName: '',
    accountDesc: '',
    reqAmt: '',
    cashRcpYn: 'Y',
    serviceCd: 'BANK' as 'BANK' | 'CARD',
    userDefine: '',
    withdrawalDate: '',
    divItemList: [] as any[]
  });

  useEffect(() => {
    loadMembers();
    // Set default withdrawal date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData(prev => ({
      ...prev,
      withdrawalDate: tomorrow.toISOString().split('T')[0]
    }));
  }, []);

  const loadMembers = async () => {
    // In a real app, fetch from database
    const testMembers = [
      {
        memberId: 'test_user_001',
        memberName: '홍길동',
        serviceCd: 'BANK',
        status: 1
      },
      {
        memberId: 'test_user_002',
        memberName: '김철수',
        serviceCd: 'CARD',
        status: 1
      }
    ];
    setMembers(testMembers.filter(m => m.status === 1)); // Only active members
  };

  const handleMemberSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const memberId = e.target.value;
    const member = members.find(m => m.memberId === memberId);
    if (member) {
      setSelectedMember(member);
      setFormData(prev => ({
        ...prev,
        memberId: member.memberId,
        memberName: member.memberName,
        serviceCd: member.serviceCd
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate message number (in real app, this would be sequential)
      const messageNo = client.generateMessageNo(Math.floor(Math.random() * 999999));
      const withdrawalDate = formData.withdrawalDate.replace(/-/g, '');

      const requestData: any = {
        memberId: formData.memberId,
        memberName: formData.memberName,
        accountDesc: formData.accountDesc || undefined,
        reqAmt: formData.reqAmt,
        cashRcpYn: formData.cashRcpYn,
        serviceCd: formData.serviceCd,
        userDefine: formData.userDefine || undefined
      };

      // Add division items if present
      if (formData.divItemList.length > 0) {
        requestData.divItemList = JSON.stringify(formData.divItemList);
      }

      const response = await client.createPayment(withdrawalDate, messageNo, requestData);
      
      if (response.resultCd === '0000') {
        alert(`출금 요청이 성공적으로 등록되었습니다.\n전문번호: ${messageNo}`);
        router.push('/nicepay/payments');
      } else {
        alert(`출금 요청 실패: ${response.resultMsg}`);
      }
    } catch (error: any) {
      console.error('Payment request failed:', error);
      alert(`출금 요청 중 오류가 발생했습니다: ${error.message}`);
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

  const addDivisionItem = () => {
    setFormData(prev => ({
      ...prev,
      divItemList: [
        ...prev.divItemList,
        { itemCd: '', dealWon: '' }
      ]
    }));
  };

  const updateDivisionItem = (index: number, field: string, value: string) => {
    const newList = [...formData.divItemList];
    newList[index][field] = value;
    setFormData(prev => ({
      ...prev,
      divItemList: newList
    }));
  };

  const removeDivisionItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      divItemList: prev.divItemList.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">새 출금 요청</h2>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-6 py-8 rounded-lg">
        {/* Member Selection */}
        <div>
          <label htmlFor="memberId" className="block text-sm font-medium text-gray-700">
            회원 선택 *
          </label>
          <select
            name="memberId"
            id="memberId"
            required
            value={formData.memberId}
            onChange={handleMemberSelect}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">회원을 선택하세요</option>
            {members.map(member => (
              <option key={member.memberId} value={member.memberId}>
                {member.memberName} ({member.memberId}) - {member.serviceCd}
              </option>
            ))}
          </select>
        </div>

        {selectedMember && (
          <>
            {/* Withdrawal Date */}
            <div>
              <label htmlFor="withdrawalDate" className="block text-sm font-medium text-gray-700">
                출금 요청일 *
              </label>
              <input
                type="date"
                name="withdrawalDate"
                id="withdrawalDate"
                required
                value={formData.withdrawalDate}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                출금일 전 영업일 17시까지 등록해야 합니다.
              </p>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="reqAmt" className="block text-sm font-medium text-gray-700">
                출금 금액 (원) *
              </label>
              <input
                type="number"
                name="reqAmt"
                id="reqAmt"
                required
                min="1"
                value={formData.reqAmt}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="50000"
              />
            </div>

            {/* Account Description */}
            <div>
              <label htmlFor="accountDesc" className="block text-sm font-medium text-gray-700">
                통장 표시 내용
              </label>
              <input
                type="text"
                name="accountDesc"
                id="accountDesc"
                maxLength={2}
                value={formData.accountDesc}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="01 (월/회차)"
              />
            </div>

            {/* Cash Receipt */}
            <div>
              <label htmlFor="cashRcpYn" className="block text-sm font-medium text-gray-700">
                현금영수증 발행
              </label>
              <select
                name="cashRcpYn"
                id="cashRcpYn"
                value={formData.cashRcpYn}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="Y">발행</option>
                <option value="N">미발행</option>
              </select>
            </div>

            {/* User Define Field */}
            <div>
              <label htmlFor="userDefine" className="block text-sm font-medium text-gray-700">
                사용자 정의 필드
              </label>
              <input
                type="text"
                name="userDefine"
                id="userDefine"
                maxLength={20}
                value={formData.userDefine}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="참조 정보"
              />
            </div>

            {/* Division Items (Optional) */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  분할 입금 정보 (선택)
                </label>
                <button
                  type="button"
                  onClick={addDivisionItem}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + 항목 추가
                </button>
              </div>
              
              {formData.divItemList.map((item, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="항목코드"
                    value={item.itemCd}
                    onChange={(e) => updateDivisionItem(index, 'itemCd', e.target.value)}
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    maxLength={8}
                  />
                  <input
                    type="number"
                    placeholder="금액"
                    value={item.dealWon}
                    onChange={(e) => updateDivisionItem(index, 'dealWon', e.target.value)}
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeDivisionItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              ))}
              
              {formData.divItemList.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  분할 금액 합계는 출금 금액과 일치해야 합니다.
                </p>
              )}
            </div>
          </>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/nicepay/payments')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || !selectedMember}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '요청 중...' : '출금 요청'}
          </button>
        </div>
      </form>
    </div>
  );
}