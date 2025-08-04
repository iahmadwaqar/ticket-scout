import { useEffect, useMemo } from 'react'
import type { ProfileStatus, PriorityLevel } from '@/types'
import { useInitialState } from '@/hooks/use-initial-state'
import { useToast } from '@/hooks/use-toast'
import {
  showTicketSuccessNotification,
  showProfileErrorNotification
} from '@/lib/notification-service'
import DashboardHeader from '@/components/dashboard/header'
import ProfileTable from '@/components/dashboard/profile-table'
import { DashboardErrorBoundary } from '@/components/dashboard-error-boundary'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const {
    isLoading,
    error,
    profiles,
    setProfiles,
    addLog
  } = useInitialState()
  const { toast } = useToast()

  useEffect(() => {
    const simulationInterval = setInterval(() => {
      setProfiles((prevProfiles) => {
        const newProfiles = [...prevProfiles]
        const profileToUpdateIndex = Math.floor(Math.random() * newProfiles.length)
        const profileToUpdate = { ...newProfiles[profileToUpdateIndex] }

        const statuses: ProfileStatus[] = ['Idle', 'Running', 'Error', 'Success', 'Next']
        const currentStatusIndex = statuses.indexOf(profileToUpdate.status)
        const nextStatus = statuses[(currentStatusIndex + 1) % statuses.length]

        profileToUpdate.status = nextStatus
        newProfiles[profileToUpdateIndex] = profileToUpdate

        // Add log entry for status change using the new addLog function
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          profileId: profileToUpdate.id,
          severity: nextStatus === 'Error' ? 'Error' : 'Info',
          message: `Profile status changed to ${nextStatus}.`
        })

        if (nextStatus === 'Success') {
          // Use centralized notification service for success events
          showTicketSuccessNotification(profileToUpdate.name)
        }
        if (nextStatus === 'Error') {
          // Use centralized notification service for error events
          showProfileErrorNotification(profileToUpdate.name)
        }

        return newProfiles
      })
    }, 3000) // Update every 3 seconds

    return () => clearInterval(simulationInterval)
  }, [
    toast,
    setProfiles,
    addLog
  ])
  // Compute summary of profiles
  const summary = useMemo(() => {
    return profiles.reduce(
      (acc, profile) => {
        if (profile.status === 'Running') acc.active++
        if (profile.status === 'Error') acc.errors++
        if (profile.status === 'Success') acc.successes++
        return acc
      },
      { active: 0, errors: 0, successes: 0 }
    )
  }, [profiles])

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-destructive">⚠️</div>
          <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  

  const handlePriorityChange = (profileId: string, priority: PriorityLevel) => {
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, priority } : p)))
  }

  const handleFieldChange = (profileId: string, field: keyof any, value: any) => {
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, [field]: value } : p)))
  }

  return (
    <>
        <div className="flex flex-col h-screen bg-background">
          <DashboardErrorBoundary componentName="Dashboard Header">
            <DashboardHeader summary={summary} />
          </DashboardErrorBoundary>
          <main className="flex-1 p-4 overflow-hidden md:p-6">
            <DashboardErrorBoundary componentName="Profile Table">
              <ProfileTable
                profiles={profiles}
                onPriorityChange={handlePriorityChange}
                onFieldChange={handleFieldChange}
              />
            </DashboardErrorBoundary>
          </main>
        </div>
    </>
  )
}
