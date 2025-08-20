'use client';

import { useState, useEffect } from 'react';
import { NicepayClient } from '@/services/nicepay-client';
import { NicepayConfig } from '@/types/nicepay.types';

// Configure client for mock API
const config: NicepayConfig = {
  serviceId: '30000000',
  apiKey: 'test-api-key-123',
  environment: 'test'
};

const client = new NicepayClient(config);

export default function NicepayDashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    pendingPayments: 0,
    completedPayments: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    // Load initial data
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // This would normally fetch from your database or API
    // For now, showing mock data
    setStats({
      totalMembers: 2,
      activeMembers: 2,
      pendingPayments: 0,
      completedPayments: 2
    });

    setRecentActivity([
      { type: 'member', action: '회원 등록', name: '홍길동', time: '10분 전' },
      { type: 'payment', action: '출금 완료', amount: '50,000원', time: '30분 전' },
      { type: 'member', action: '회원 등록', name: '김철수', time: '1시간 전' },
      { type: 'payment', action: '출금 예정', amount: '100,000원', time: '2시간 전' }
    ]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    전체 회원
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.totalMembers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    활성 회원
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.activeMembers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    대기중 출금
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.pendingPayments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    완료된 출금
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.completedPayments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            최근 활동
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentActivity.map((activity, index) => (
            <li key={index}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {activity.type === 'member' ? (
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {activity.action}
                      </div>
                      <div className="text-sm text-gray-500">
                        {activity.name || activity.amount}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {activity.time}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            빠른 작업
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <a
              href="/nicepay/members/new"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              새 회원 등록
            </a>
            <a
              href="/nicepay/payments/new"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              출금 요청
            </a>
            <a
              href="/nicepay/calendar"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              정산 일정 확인
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}