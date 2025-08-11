import { useMemo, useState, useEffect } from 'react'
import type { PriorityLevel, EnhancedProfile } from '@/types'
import { useInitialState } from '@/hooks/use-initial-state'
import { useToastIPC } from '@/hooks/use-toast-ipc'
import DashboardHeader from '@/components/dashboard/header'
import ProfileTable from '@/components/dashboard/profile-table'
import LogStrip from '@/components/dashboard/log-strip'
import CollapsibleLogPanel from '@/components/dashboard/collapsible-log-panel'
import SettingsDialog from '@/components/settings/settings-dialog'
import { DashboardErrorBoundary } from '@/components/dashboard-error-boundary'
import { logger } from '@/lib/logger'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { isLoading, error, profiles, setProfiles } = useInitialState()
  
  // Initialize toast IPC listener
  useToastIPC()

  const [showSettings, setShowSettings] = useState(false)
  const [showLogPanel, setShowLogPanel] = useState(false)

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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'l') {
        event.preventDefault()

        // Send a log message to the viewer
        await logger.globalInfo('Log panel toggled via Ctrl+L shortcut')

        toggleLogPanel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showLogPanel])

  const toggleLogPanel = () => {
    setShowLogPanel(!showLogPanel)
  }

  // Handle launch all events
  useEffect(() => {
    const unsubscribeProfilesFetched = window.api.onProfilesFetched((newProfiles) => {
      console.log('🚀 Profiles fetched event received:', newProfiles)
      logger.globalInfo(`Received ${newProfiles.length} profiles from launch all`)
      
      // Add new profiles to the existing profiles
      setProfiles(prev => {
        console.log('📊 Current profiles before update:', prev)
        // Remove any existing profiles with same IDs to avoid duplicates
        const existingIds = new Set(prev.map(p => p.id))
        const uniqueNewProfiles = newProfiles.filter(p => !existingIds.has(p.id))
        const updatedProfiles = [...prev, ...uniqueNewProfiles]
        console.log('📊 Updated profiles after adding new ones:', updatedProfiles)
        return updatedProfiles
      })
    })

    const unsubscribeProfileStatusChanged = window.api.onProfileStatusChanged((update) => {
      console.log('🔄 Profile status update received:', update)
      logger.info(update.profileId, `Status changed to: ${update.status}${update.message ? ` - ${update.message}` : ''}`)
      
      // Update the specific profile's status and enhanced data
      setProfiles(prev => prev.map(profile => {
        if (profile.id === update.profileId) {
          const enhancedUpdate = update as any; // Cast to access enhanced fields
          return {
            ...profile,
            status: update.status as any,
            // Update enhanced fields if they exist in the update
            ...(enhancedUpdate.ticketCount !== undefined && { ticketCount: enhancedUpdate.ticketCount }),
            ...(enhancedUpdate.lastActivity !== undefined && { lastActivity: enhancedUpdate.lastActivity }),
            ...(enhancedUpdate.errorMessage !== undefined && { errorMessage: enhancedUpdate.errorMessage }),
            ...(enhancedUpdate.operationalState !== undefined && { operationalState: enhancedUpdate.operationalState }),
            ...(enhancedUpdate.launchedAt !== undefined && { launchedAt: enhancedUpdate.launchedAt }),
            ...(enhancedUpdate.stoppedAt !== undefined && { stoppedAt: enhancedUpdate.stoppedAt })
          }
        }
        return profile
      }))
    })

    const unsubscribeAllProfilesClosed = window.api.onAllProfilesClosed(() => {
      console.log('🧹 All profiles closed event received - clearing dashboard')
      logger.globalInfo('All profiles closed - clearing dashboard')
      
      // Clear all profiles from the dashboard
      setProfiles([])
    })

    return () => {
      unsubscribeProfilesFetched()
      unsubscribeProfileStatusChanged()
      unsubscribeAllProfilesClosed()
    }
  }, [setProfiles])

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

  const handleProfileRemove = (profileId: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== profileId))
  }

  const handleCloseAll = () => {
    setProfiles([])
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-background">
        <DashboardErrorBoundary componentName="Dashboard Header">
          <DashboardHeader summary={summary} onShowSettings={() => setShowSettings(true)} onCloseAll={handleCloseAll} />
        </DashboardErrorBoundary>
        <main className="flex-1 p-4 overflow-hidden md:p-6">
          {/* Full width profile table */}
          <DashboardErrorBoundary componentName="Profile Table">
            <ProfileTable
              profiles={profiles}
              onPriorityChange={handlePriorityChange}
              onFieldChange={handleFieldChange}
              onProfileRemove={handleProfileRemove}
            />
          </DashboardErrorBoundary>
        </main>

        {/* Log Strip - Always visible at bottom */}
        <DashboardErrorBoundary componentName="Log Strip">
          <LogStrip onToggleExpanded={toggleLogPanel} isExpanded={showLogPanel} />
        </DashboardErrorBoundary>
      </div>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />

      {/* Collapsible Log Panel */}
      <CollapsibleLogPanel isOpen={showLogPanel} onClose={() => setShowLogPanel(false)} />
    </>
  )
}
