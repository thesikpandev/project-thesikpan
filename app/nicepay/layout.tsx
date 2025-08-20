export default function NicepayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                NICEPAY CMS 관리 시스템
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/nicepay" className="text-gray-700 hover:text-gray-900">
                대시보드
              </a>
              <a href="/nicepay/members" className="text-gray-700 hover:text-gray-900">
                회원관리
              </a>
              <a href="/nicepay/payments" className="text-gray-700 hover:text-gray-900">
                출금관리
              </a>
              <a href="/nicepay/calendar" className="text-gray-700 hover:text-gray-900">
                정산캘린더
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}