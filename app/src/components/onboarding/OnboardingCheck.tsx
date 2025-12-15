'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OnboardingWizard } from './OnboardingWizard'

interface OnboardingCheckProps {
  userId: string
  userName?: string
  hasWorkspaces: boolean
  children: React.ReactNode
}

export function OnboardingCheck({ userId, userName, hasWorkspaces, children }: OnboardingCheckProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    async function checkOnboardingStatus() {
      // If user already has workspaces, they don't need onboarding
      if (hasWorkspaces) {
        setIsChecking(false)
        return
      }

      try {
        const supabase = createClient()
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('preferences')
          .eq('id', userId)
          .single()

        const preferences = profile?.preferences as { onboarding_completed?: boolean } | null
        const onboardingCompleted = preferences?.onboarding_completed === true

        if (!onboardingCompleted) {
          setShowOnboarding(true)
        }
      } catch (error) {
        // If profile doesn't exist, show onboarding
        setShowOnboarding(true)
      } finally {
        setIsChecking(false)
      }
    }

    checkOnboardingStatus()
  }, [userId, hasWorkspaces])

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingWizard
          userId={userId}
          userName={userName}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
    </>
  )
}
