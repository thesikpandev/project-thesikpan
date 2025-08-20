'use client';

import { useState, useEffect } from 'react';
import { SettlementCalendar } from '@/mock-server/settlement-calendar';

const calendar = new SettlementCalendar();

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [settlementInfo, setSettlementInfo] = useState<any>(null);

  useEffect(() => {
    generateCalendar();
  }, [currentMonth]);

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      const date = new Date(current);
      const isCurrentMonth = date.getMonth() === month;
      const isBusinessDay = calendar.isBusinessDay(date);
      const isToday = isDateToday(date);
      
      days.push({
        date,
        isCurrentMonth,
        isBusinessDay,
        isToday,
        day: date.getDate()
      });

      current.setDate(current.getDate() + 1);
    }

    setCalendarDays(days);
  };

  const isDateToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    
    if (calendar.isBusinessDay(date)) {
      const dateStr = calendar.formatDateYYYYMMDD(date);
      const bankSettlement = calendar.calculateSettlementDate(dateStr, 'BANK');
      const cardSettlement = calendar.calculateSettlementDate(dateStr, 'CARD');
      const withdrawalDeadline = calendar.getPreviousBusinessDay(date);
      
      setSettlementInfo({
        date: calendar.formatDate(date),
        isBusinessDay: true,
        withdrawalDeadline: calendar.formatDate(withdrawalDeadline) + ' 17:00',
        bankSettlement: bankSettlement.settleDt,
        cardSettlement: cardSettlement.settleDt,
        memberRegistrationInfo: getMemberRegistrationInfo(date),
        paymentRegistrationInfo: getPaymentRegistrationInfo(date)
      });
    } else {
      setSettlementInfo({
        date: calendar.formatDate(date),
        isBusinessDay: false
      });
    }
  };

  const getMemberRegistrationInfo = (date: Date) => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return {
        processDate: calendar.formatDate(date),
        resultAvailable: calendar.formatDate(calendar.getNextBusinessDay(date)) + ' 13:00'
      };
    } else {
      return {
        processDate: calendar.formatDate(calendar.getNextBusinessDay(date)),
        resultAvailable: calendar.formatDate(calendar.addBusinessDays(date, 2)) + ' 13:00'
      };
    }
  };

  const getPaymentRegistrationInfo = (date: Date) => {
    return {
      deadline: calendar.formatDate(calendar.getPreviousBusinessDay(date)) + ' 17:00',
      bankResult: calendar.formatDate(calendar.getNextBusinessDay(date)) + ' 13:00',
      cardResult: calendar.formatDate(date) + ' (승인 당일)'
    };
  };

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">정산 캘린더</h2>

      <div className="bg-white shadow rounded-lg p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-lg font-semibold">
            {currentMonth.getFullYear()}년 {monthNames[currentMonth.getMonth()]}
          </h3>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day, index) => (
            <div
              key={day}
              className={`text-center text-sm font-medium p-2 ${
                index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              onClick={() => handleDateClick(day.date)}
              className={`
                p-3 text-sm rounded-lg transition-colors
                ${!day.isCurrentMonth ? 'text-gray-400' : ''}
                ${day.isBusinessDay ? 'hover:bg-blue-50' : 'bg-gray-50'}
                ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                ${selectedDate?.getTime() === day.date.getTime() ? 'bg-blue-100' : ''}
                ${day.date.getDay() === 0 ? 'text-red-600' : ''}
                ${day.date.getDay() === 6 ? 'text-blue-600' : ''}
              `}
            >
              <div className="font-medium">{day.day}</div>
              {day.isCurrentMonth && day.isBusinessDay && (
                <div className="text-xs text-gray-500 mt-1">영업일</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Settlement Information */}
      {settlementInfo && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {settlementInfo.date} 정산 정보
          </h3>
          
          {settlementInfo.isBusinessDay ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">출금 정보</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">등록 마감:</dt>
                      <dd className="font-medium">{settlementInfo.withdrawalDeadline}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">은행 정산일:</dt>
                      <dd className="font-medium">{settlementInfo.bankSettlement}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">카드 정산일:</dt>
                      <dd className="font-medium">{settlementInfo.cardSettlement}</dd>
                    </div>
                  </dl>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">회원등록 정보</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">처리일:</dt>
                      <dd className="font-medium">{settlementInfo.memberRegistrationInfo.processDate}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">결과 확인:</dt>
                      <dd className="font-medium">{settlementInfo.memberRegistrationInfo.resultAvailable}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">비즈니스 규칙</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• 회원등록: 12시 이전 등록 → 당일 처리, 12시 이후 → 익영업일 처리</li>
                  <li>• 출금요청: D-1일 17시까지 등록 필수</li>
                  <li>• 은행출금: D+1일 13시 결과 확인 가능</li>
                  <li>• 카드결제: 당일 승인, D+1일 13시 수수료 확인</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>휴일/주말은 영업일이 아닙니다.</p>
              <p className="text-sm mt-2">출금 및 정산 처리가 진행되지 않습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">범례</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded mr-2"></div>
            <span>영업일</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-50 rounded mr-2"></div>
            <span>휴일/주말</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-white ring-2 ring-blue-500 rounded mr-2"></div>
            <span>오늘</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 rounded mr-2"></div>
            <span>선택된 날짜</span>
          </div>
        </div>
      </div>
    </div>
  );
}