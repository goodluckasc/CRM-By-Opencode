import { useState } from 'react'
import { Menu, Moon, Sun, Bell, PhoneCall, CalendarClock, AlertTriangle } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { getGreeting } from '../../utils/helpers'
import { useAuth } from '../../contexts/AuthContext'
import useNotifications from '../../hooks/useNotifications'
import { useNavigate } from 'react-router-dom'

export default function Navbar({ onMenuClick }) {
  const { darkMode, setDarkMode } = useTheme()
  const { userData } = useAuth()
  const { notifications, count } = useNotifications()
  const [showNotif, setShowNotif] = useState(false)
  const navigate = useNavigate()

  const typeIcon = {
    overdue: AlertTriangle,
    due_today: CalendarClock,
    due_tomorrow: CalendarClock,
  }

  const typeColor = {
    overdue: 'text-red-600',
    due_today: 'text-orange-600',
    due_tomorrow: 'text-blue-600',
  }

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getGreeting()}, {userData?.displayName?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>

            {showNotif && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotif(false)} />
                <div className="absolute right-0 mt-2 z-20 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Notifications {count > 0 && <span className="text-gray-500 font-normal">({count})</span>}
                    </p>
                  </div>
                  <div className="overflow-y-auto max-h-72">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No pending notifications
                      </div>
                    ) : (
                      notifications.slice(0, 50).map((n) => {
                        const Icon = typeIcon[n.type]
                        return (
                          <button
                            key={n.customer.id}
                            onClick={() => { setShowNotif(false); navigate('/call-list') }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-start gap-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                          >
                            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${typeColor[n.type]}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {n.customer.customerName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {n.customer.vehicleNumber} — {n.label}
                              </p>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => { setShowNotif(false); navigate('/call-list') }}
                      className="w-full px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 border-t border-gray-200 dark:border-gray-700"
                    >
                      <PhoneCall className="w-4 h-4 inline mr-1.5" />
                      View All in Call List
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
