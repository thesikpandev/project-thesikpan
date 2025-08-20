'use client';

import { useState, useEffect } from 'react';
import { NicepayClient } from '@/services/nicepay-client';
import { NicepayConfig, MemberInfo } from '@/types/nicepay.types';

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

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    // In a real app, this would fetch from your database
    // For demo, we'll show test members
    const testMembers = [
      {
        memberId: 'test_user_001',
        memberName: '홍길동',
        serviceCd: 'BANK',
        bankCd: '004',
        accountNo: '1234****1234',
        hpNo: '010-1234-5678',
        status: 1,
        statusText: '정상',
        regDt: '2024-01-15'
      },
      {
        memberId: 'test_user_002',
        memberName: '김철수',
        serviceCd: 'CARD',
        cardNo: '1234-****-****-5678',
        hpNo: '010-9876-5432',
        status: 1,
        statusText: '정상',
        regDt: '2024-01-16'
      }
    ];
    setMembers(testMembers);
  };

  const getMemberDetails = async (memberId: string) => {
    setLoading(true);
    try {
      const response = await client.getMember(memberId);
      if (response.memberInfo) {
        setSelectedMember(response.memberInfo);
      }
    } catch (error) {
      console.error('Failed to get member details:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMember = async (memberId: string) => {
    if (!confirm('정말로 이 회원을 삭제하시겠습니까?')) return;
    
    setLoading(true);
    try {
      await client.deleteMember(memberId);
      alert('회원이 삭제되었습니다.');
      loadMembers();
    } catch (error) {
      console.error('Failed to delete member:', error);
      alert('회원 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    const statusMap: { [key: number]: { text: string; class: string } } = {
      0: { text: '등록대기', class: 'bg-yellow-100 text-yellow-800' },
      1: { text: '정상', class: 'bg-green-100 text-green-800' },
      2: { text: '등록실패', class: 'bg-red-100 text-red-800' },
      3: { text: '해지', class: 'bg-gray-100 text-gray-800' }
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
        <h2 className="text-2xl font-bold text-gray-900">회원 관리</h2>
        <a
          href="/nicepay/members/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          새 회원 등록
        </a>
      </div>

      {/* Members Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                회원 ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                서비스
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                계좌/카드
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                전화번호
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                등록일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.memberId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {member.memberId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.memberName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`inline-flex px-2 py-1 text-xs rounded ${
                    member.serviceCd === 'BANK' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {member.serviceCd}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.accountNo || member.cardNo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.hpNo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(member.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.regDt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => getMemberDetails(member.memberId)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    상세
                  </button>
                  <button
                    onClick={() => deleteMember(member.memberId)}
                    className="text-red-600 hover:text-red-900"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              회원 상세 정보
            </h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium">회원 ID:</span> {selectedMember.memberId}
              </div>
              <div>
                <span className="font-medium">이름:</span> {selectedMember.memberName}
              </div>
              <div>
                <span className="font-medium">서비스:</span> {selectedMember.serviceCd}
              </div>
              {selectedMember.bankCd && (
                <div>
                  <span className="font-medium">은행:</span> {selectedMember.bankCd}
                </div>
              )}
              {selectedMember.accountNo && (
                <div>
                  <span className="font-medium">계좌번호:</span> {selectedMember.accountNo}
                </div>
              )}
              {selectedMember.cardNo && (
                <div>
                  <span className="font-medium">카드번호:</span> {selectedMember.cardNo}
                </div>
              )}
              <div>
                <span className="font-medium">전화번호:</span> {selectedMember.hpNo}
              </div>
              <div>
                <span className="font-medium">이메일:</span> {selectedMember.email || '-'}
              </div>
              <div>
                <span className="font-medium">등록일:</span> {selectedMember.regDt}
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setSelectedMember(null)}
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