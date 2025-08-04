import { useMemo, useState, useEffect } from 'react'
import type { PriorityLevel } from '@/types'
import { useInitialState } from '@/hooks/use-initial-state'
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
          <DashboardHeader summary={summary} onShowSettings={() => setShowSettings(true)} />
        </DashboardErrorBoundary>
        <main className="flex-1 p-4 overflow-hidden md:p-6">
          {/* Full width profile table */}
          <DashboardErrorBoundary componentName="Profile Table">
            <ProfileTable
              profiles={profiles}
              onPriorityChange={handlePriorityChange}
              onFieldChange={handleFieldChange}
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
