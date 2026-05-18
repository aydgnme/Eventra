import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Menu } from 'lucide-react'
import Navbar from '../../components/Navbar'
import AdminSidebar from '../../components/admin/AdminSidebar'
import adminService from '../../services/adminService'

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: pendingData } = useQuery({
    queryKey: ['admin', 'pending-events'],
    queryFn: adminService.getPendingEvents,
    staleTime: 30_000,
  })

  const pendingCount = pendingData?.events?.length ?? 0

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar
          pendingCount={pendingCount}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-fg-2 hover:text-fg hover:bg-surface-alt transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-fg">Admin Panel</span>
          </div>

          {/* Route content */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
