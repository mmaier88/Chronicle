'use client'

import { VeltProvider as VP } from '@veltdev/react'
import { ReactNode } from 'react'

interface VeltProviderProps {
  children: ReactNode
}

export function VeltProvider({ children }: VeltProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_VELT_API_KEY

  if (!apiKey) {
    console.warn('Velt API key not configured. Collaboration features will be disabled.')
    return <>{children}</>
  }

  return (
    <VP apiKey={apiKey}>
      {children}
    </VP>
  )
}
