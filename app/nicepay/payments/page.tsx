'use client';

import { useState, useEffect } from 'react';
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    // In a real app, this would fetch from your database
    const testPayments = [
      {
        messageNo: '000001',
        memberId: 'test_user_001',
        memberName: '홍길동',
        serviceCd: 'BANK',
        reqAmt: '50,000',
        status: 1,
        statusText: '출금성공',
        sendDt: '2024-01-20',
        fee: '500'
      },
      {
        messageNo: '000002',
        memberId: 'test_user_002',
        memberName: '김철수',
        serviceCd: 'CARD',
        reqAmt: '100,000',
        status: 1,
        statusText: '승인완료',
        sendDt: '2024-01-20',
        appNo: '12345678',
        fee: '1,000'
      },
      {
        messageNo: '000003',
        memberId: 'test_user_001',
        memberName: '홍길동',
        serviceCd: 'BANK',
        reqAmt: '75,000',
        status: 0,
        statusText: '대기중',
        sendDt: '2024-01-21',
        fee: '-'
      }
    ];
    setPayments(testPayments);
  };

  const getPaymentDetails = async (date: string, messageNo: string) => {
    setLoading(true);
    try {
      const response = await client.getPayment(date, messageNo);
      if (response.payInfo) {
        setSelectedPayment(response.payInfo);
      }
    } catch (error) {
      console.error('Failed to get payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelPayment = async (date: string, messageNo: string, isCard: boolean) => {
    if (!isCard) {
      alert('계좌 출금은 취소할 수 없습니다. 카드 결제만 취소 가능합니다.');
      return;
    }

    if (!confirm('정말로 이 결제를 취소하시겠습니까?')) return;
    
    setLoading(true);
    try {
      const today = client.formatDate(new Date());
      await client.cancelCardPayment(date, messageNo, today);
      alert('결제가 취소 요청되었습니다.');
      loadPayments();
    } catch (error) {
      console.error('Failed to cancel payment:', error);
      alert('결제 취소에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (date: string, messageNo: string, status: number) => {
    if (status !== 0) {
      alert('대기중인 출금만 삭제할 수 있습니다.');
      return;
    }

    if (!confirm('정말로 이 출금 요청을 삭제하시겠습니까?')) return;
    
    setLoading(true);
    try {
      await client.deletePayment(date, messageNo);
      alert('출금 요청이 삭제되었습니다.');
      loadPayments();
    } catch (error) {
      console.error('Failed to delete payment:', error);
      alert('출금 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    const statusMap: { [key: number]: { text: string; class: string } } = {
      0: { text: '대기중', class: 'bg-yellow-100 text-yellow-800' },
      1: { text: '성공', class: 'bg-green-100 text-green-800' },
      2: { text: '실패', class: 'bg-red-100 text-red-800' },
      3: { text: '취소요청중', class: 'bg-orange-100 text-orange-800' },
      4: { text: '취소완료', class: 'bg-gray-100 text-gray-800' }
    };
    const statusInfo = statusMap[status] || { text: '알수없음', class: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">출금 관리</h2>
        <a
          href="/nicepay/payments/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          새 출금 요청
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">오늘 출금 예정</div>
          <div className="text-2xl font-bold text-gray-900">3건</div>
          <div className="text-sm text-gray-600">₩225,000</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">이번 주 출금</div>
          <div className="text-2xl font-bold text-gray-900">15건</div>
          <div className="text-sm text-gray-600">₩1,125,000</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">이번 달 출금</div>
          <div className="text-2xl font-bold text-gray-900">67건</div>
          <div className="text-sm text-gray-600">₩5,025,000</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">실패/취소</div>
          <div className="text-2xl font-bold text-red-600">2건</div>
          <div className="text-sm text-gray-600">₩150,000</div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                전문번호
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                회원
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                서비스
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수수료
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                출금일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.messageNo}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {payment.messageNo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{payment.memberName}</div>
                  <div className="text-xs text-gray-400">{payment.memberId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`inline-flex px-2 py-1 text-xs rounded ${
                    payment.serviceCd === 'BANK' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {payment.serviceCd}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  ₩{payment.reqAmt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₩{payment.fee}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(payment.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {payment.sendDt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => getPaymentDetails(payment.sendDt.replace(/-/g, ''), payment.messageNo)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    상세
                  </button>
                  {payment.serviceCd === 'CARD' && payment.status === 1 && (
                    <button
                      onClick={() => cancelPayment(payment.sendDt.replace(/-/g, ''), payment.messageNo, true)}
                      className="text-orange-600 hover:text-orange-900 mr-3"
                    >
                      취소
                    </button>
                  )}
                  {payment.status === 0 && (
                    <button
                      onClick={() => deletePayment(payment.sendDt.replace(/-/g, ''), payment.messageNo, payment.status)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              출금 상세 정보
            </h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium">전문번호:</span> {selectedPayment.messageNo}
              </div>
              <div>
                <span className="font-medium">회원명:</span> {selectedPayment.memberName}
              </div>
              <div>
                <span className="font-medium">서비스:</span> {selectedPayment.serviceCd}
              </div>
              <div>
                <span className="font-medium">금액:</span> ₩{selectedPayment.reqAmt}
              </div>
              <div>
                <span className="font-medium">수수료:</span> ₩{selectedPayment.fee || '0'}
              </div>
              <div>
                <span className="font-medium">출금일:</span> {selectedPayment.sendDt}
              </div>
              {selectedPayment.appNo && (
                <div>
                  <span className="font-medium">승인번호:</span> {selectedPayment.appNo}
                </div>
              )}
              <div>
                <span className="font-medium">현금영수증:</span> {selectedPayment.cashRcpYn === 'Y' ? '발행' : '미발행'}
              </div>
              <div>
                <span className="font-medium">결과메시지:</span> {selectedPayment.bankResultMsg || '처리중'}
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setSelectedPayment(null)}
                className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}