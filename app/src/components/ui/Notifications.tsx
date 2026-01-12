'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'

type NotificationType = 'error' | 'warning' | 'success' | 'info'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
}

interface NotificationContextValue {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  showError: (title: string, message: string) => void
  showWarning: (title: string, message: string) => void
  showSuccess: (title: string, message: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const duration = notification.duration ?? (notification.type === 'error' ? 10000 : 5000)

    setNotifications(prev => [...prev, { ...notification, id }])

    if (duration > 0) {
      setTimeout(() => removeNotification(id), duration)
    }
  }, [removeNotification])

  const showError = useCallback((title: string, message: string) => {
    addNotification({ type: 'error', title, message })
  }, [addNotification])

  const showWarning = useCallback((title: string, message: string) => {
    addNotification({ type: 'warning', title, message })
  }, [addNotification])

  const showSuccess = useCallback((title: string, message: string) => {
    addNotification({ type: 'success', title, message })
  }, [addNotification])

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      showError,
      showWarning,
      showSuccess,
    }}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onDismiss={removeNotification}
      />
    </NotificationContext.Provider>
  )
}

function NotificationContainer({
  notifications,
  onDismiss,
}: {
  notifications: Notification[]
  onDismiss: (id: string) => void
}) {
  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => onDismiss(notification.id)}
        />
      ))}
    </div>
  )
}

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: Notification
  onDismiss: () => void
}) {
  const icons: Record<NotificationType, typeof AlertCircle> = {
    error: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle,
    info: Info,
  }

  const colors: Record<NotificationType, { bg: string; border: string; icon: string }> = {
    error: {
      bg: 'bg-red-950/90',
      border: 'border-red-800',
      icon: 'text-red-400',
    },
    warning: {
      bg: 'bg-amber-950/90',
      border: 'border-amber-800',
      icon: 'text-amber-400',
    },
    success: {
      bg: 'bg-green-950/90',
      border: 'border-green-800',
      icon: 'text-green-400',
    },
    info: {
      bg: 'bg-blue-950/90',
      border: 'border-blue-800',
      icon: 'text-blue-400',
    },
  }

  const Icon = icons[notification.type]
  const color = colors[notification.type]

  return (
    <div
      className={`${color.bg} ${color.border} border rounded-lg p-4 shadow-lg backdrop-blur-sm animate-slide-up`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={`${color.icon} w-5 h-5 mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white text-sm">{notification.title}</h4>
          <p className="text-gray-300 text-sm mt-0.5">{notification.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
