import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select.jsx'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'
import { cn } from '@/lib/utils.js'
import {
  LogIn,
  Copy,
  Play,
  ArrowUpDown,
  Square,
  Trash2,
  Search,
  ArrowLeftRight,
  Maximize2,
  RotateCcw,
  PlayCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast.js'
import {
  PROFILE_STATUSES,
  isErrorStatus,
  canResume,
  isStoppable,
  canLogin
} from '../../../../shared/status-constants.js'
import { logger } from '@renderer/lib/logger.js'

export default function ProfileTable({ profiles }) {
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [sortKey, setSortKey] = useState('priority')
  const [sortDirection, setSortDirection] = useState('asc')
  const [launchingProfiles, setLaunchingProfiles] = useState(new Set())
  const { toast } = useToast()

  const priorityOrder = { High: 0, Medium: 1, Low: 2 }

  const sortedProfiles = useMemo(() => {
    if (!sortKey) return profiles
    const sorted = [...profiles].sort((a, b) => {
      if (sortKey === 'priority') {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      const valA = a[sortKey]
      const valB = b[sortKey]
      if (valA == null && valB == null) return 0
      if (valA == null) return 1
      if (valB == null) return -1
      if (valA < valB) return -1
      if (valA > valB) return 1
      return 0
    })
    return sortDirection === 'asc' ? sorted : sorted.reverse()
  }, [profiles, sortKey, sortDirection, priorityOrder])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  // const handleSelectAll = (checked) => {
  //   if (checked) {
  //     setSelectedRows(new Set(profiles.map((p) => p.id)))
  //   } else {
  //     setSelectedRows(new Set())
  //   }
  // }

  // const handleSelectRow = (id, checked) => {
  //   setSelectedRows((prev) => {
  //     const newSet = new Set(prev)
  //     if (checked) {
  //       newSet.add(id)
  //     } else {
  //       newSet.delete(id)
  //     }
  //     return newSet
  //   })
  // }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      // Basic states
      case 'Idle':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'Launching':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse'
      case 'Ready':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      case 'Active':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse'
      case 'Stopping':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse'
      case 'Stopped':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      case 'Closing':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse'
      case 'Closed':
        return 'bg-gray-600/20 text-gray-300 border-gray-600/30'

      // Authentication states
      case 'LoggedIn':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'LoggingIn':
        return 'bg-green-600/20 text-green-500 border-green-600/30 animate-pulse'
      case 'LoginFailed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'SessionExpired':
        return 'bg-orange-600/20 text-orange-500 border-orange-600/30'

      // Navigation and operation states
      case 'Navigating':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30 animate-pulse'
      case 'Scraping':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse'
      case 'SearchingTickets':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse'
      case 'RandomBrowsing':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/30 animate-pulse'
      case 'InQueue':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-bounce'
      case 'WaitingForCaptcha':
        return 'bg-yellow-600/20 text-yellow-500 border-yellow-600/30 animate-bounce'
      case 'RateLimited':
        return 'bg-red-600/20 text-red-500 border-red-600/30'

      // Completion states
      case 'Success':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'Completed':
        return 'bg-green-600/20 text-green-500 border-green-600/30'

      // Error states (all red variants)
      case 'Error':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Error Launching':
        return 'bg-red-600/20 text-red-500 border-red-600/30'
      case 'Error Closing':
        return 'bg-red-700/20 text-red-600 border-red-700/30'
      case 'Error Navigating':
        return 'bg-red-600/20 text-red-500 border-red-600/30'
      case 'Error Scraping':
        return 'bg-red-700/20 text-red-600 border-red-700/30'
      case 'Error Login':
        return 'bg-red-800/20 text-red-700 border-red-800/30'

      // Cookie related states
      case 'Cookies Loading':
        return 'bg-blue-600/20 text-blue-500 border-blue-600/30 animate-pulse'
      case 'Cookies Loaded':
        return 'bg-green-600/20 text-green-500 border-green-600/30'
      case 'Cookies Saving':
        return 'bg-blue-700/20 text-blue-600 border-blue-700/30 animate-pulse'
      case 'Cookies Saved':
        return 'bg-green-700/20 text-green-600 border-green-700/30'
      case 'Cookies Failed':
        return 'bg-red-600/20 text-red-500 border-red-600/30'

      // Additional operational states
      case 'Paused':
        return 'bg-yellow-700/20 text-yellow-600 border-yellow-700/30'
      case 'Resuming':
        return 'bg-blue-600/20 text-blue-500 border-blue-600/30 animate-pulse'
      case 'Restarting':
        return 'bg-cyan-600/20 text-cyan-500 border-cyan-600/30 animate-pulse'
      case 'Updating':
        return 'bg-purple-600/20 text-purple-500 border-purple-600/30 animate-pulse'
      case 'Initializing':
        return 'bg-gray-600/20 text-gray-500 border-gray-600/30 animate-pulse'

      // Legacy status support
      case 'Running':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse'
      case 'Next':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'

      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getLoginButtonClass = (loginState) => {
    switch (loginState) {
      case 'LoggedIn':
        return 'hover:bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'LoggingIn':
        return 'hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse'
      case 'LoginFailed':
      case 'SessionExpired':
      case 'LoggedOut':
        return 'hover:bg-green-500/20 text-green-400 border-green-500/30'
      default:
        return 'hover:bg-accent cursor-pointer'
    }
  }

  const handleExchangeClick = async (profileId, profileName) => {
    try {
      // Send start looking for tickets command
      const result = await window.api.startLookingForTickets(profileId)

      if (result.success) {
        toast({
          title: 'Exchange Started',
          description: `Started looking for tickets on ${profileName}`
        })
      } else {
        toast({
          title: 'Exchange Failed',
          description: result.message || `Failed to start exchange on ${profileName}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error starting exchange:', error)
      toast({
        title: 'Exchange Error',
        description: `Error starting exchange on ${profileName}`,
        variant: 'destructive'
      })
    }
  }

  const handleLoginClick = async (profileId, profileName) => {
    try {
      // Send login command to IPC
      const result = await window.api.loginProfile(profileId)

      if (result.success) {
        toast({
          title: 'Login Started',
          description: result.message || `Login started for ${profileName}`
        })
      } else {
        toast({
          title: 'Login Failed',
          description: result.message || `Failed to login ${profileName}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      logger.error('Error logging in:', error)
      toast({
        title: 'Login Error',
        description: `Error logging in ${profileName}`,
        variant: 'destructive'
      })
    }
  }

  const handleSwitchProfileLogin = async (profileId, profileName) => {
    try {
      // Send profile data modify request for switching login
      const result = await window.api.switchProfileLogin(profileId)

      if (result.success) {
        toast({
          title: 'Profile Switch',
          description: `Switched profile login for ${profileName}`
        })
      } else {
        toast({
          title: 'Switch Failed',
          description: result.message || `Failed to switch profile login for ${profileName}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error switching profile:', error)
      toast({
        title: 'Switch Error',
        description: `Error switching profile login for ${profileName}`,
        variant: 'destructive'
      })
    }
  }

  const handleCopyCardDetails = (profile) => {
    const cardDetails = `Card: ${profile.cardInfo || 'N/A'}\nExpiry: ${profile.expiry || 'N/A'}\nCVV: ${profile.cvv || 'N/A'}`
    navigator.clipboard.writeText(cardDetails)
    toast({
      title: 'Card Details Copied',
      description: 'Full card details copied to clipboard'
    })
  }

  const handleSeatsChange = async (profileId, profileName, seats) => {
    try {
      // Send profile data modify with seats number to IPC
      const result = await window.api.updateProfileSeats(profileId, seats)

      if (result.success) {
        toast({
          title: 'Seats Updated',
          description: `Updated seats to ${seats} for ${profileName}`
        })
      } else {
        toast({
          title: 'Update Failed',
          description: result.message || `Failed to update seats for ${profileName}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error updating seats:', error)
      toast({
        title: 'Update Error',
        description: `Error updating seats for ${profileName}`,
        variant: 'destructive'
      })
    }
  }

  const handleBringToFront = async (profileId, profileName) => {
    try {
      // Bring GoLogin profile to front by maximizing and bringing to front
      const result = await window.api.bringProfileToFront(profileId)

      if (result.success) {
        toast({
          title: 'Profile Brought to Front',
          description: result.message || `${profileName} window maximized and brought to front`
        })
      } else {
        toast({
          title: 'Bring to Front Failed',
          description: result.message || `Failed to bring ${profileName} to front`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error bringing profile to front:', error)
      toast({
        title: 'Bring to Front Error',
        description: `Error bringing ${profileName} to front`,
        variant: 'destructive'
      })
    }
  }

  const handleFieldChange = async (profileId, profileName, field, value) => {
    try {
      // Send field update to IPC
      const result = await window.api.updateProfileField(profileId, field, value)

      if (result.success) {
        // Only show toast for significant changes, not every keystroke
        // toast({
        //   title: 'Field Updated',
        //   description: `Updated ${field} for ${profileName}`
        // })
      } else {
        toast({
          title: 'Update Failed',
          description: result.message || `Failed to update ${field} for ${profileName}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error)
      // Only show error toasts, not success ones to avoid spam
      toast({
        title: 'Update Error',
        description: `Error updating ${field} for ${profileName}`,
        variant: 'destructive'
      })
    }
  }

  const handleLaunchProfile = async (profileId, profileName) => {
    setLaunchingProfiles((prev) => new Set(prev).add(profileId))

    try {
      // Use the new individual profile launch IPC channel
      const result = await window.api.launchSingleProfile(profileId)

      if (result.success) {
        toast({
          title: 'Profile Launch',
          description: `${profileName} launched successfully`
        })
      } else {
        toast({
          title: 'Launch Failed',
          description: result.message || `Failed to launch ${profileName}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error launching profile:', error)
      toast({
        title: 'Launch Error',
        description: `Error launching ${profileName}`,
        variant: 'destructive'
      })
    } finally {
      setLaunchingProfiles((prev) => {
        const newSet = new Set(prev)
        newSet.delete(profileId)
        return newSet
      })
    }
  }

  const handleStartProfile = async (profileId, profileName) => {
    try {
      const result = await window.api.startSingleProfile(profileId)

      if (result.success) {
        toast({
          title: 'Profile Start',
          description: `${profileName} started successfully`
        })
      } else {
        toast({
          title: 'Start Failed',
          description: result.message || `Failed to start ${profileName}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error starting profile:', error)
      toast({
        title: 'Start Error',
        description: `Error starting ${profileName}`,
        variant: 'destructive'
      })
    }
  }

  const handleStopProfile = async (profileId, profileName) => {
    try {
      const result = await window.api.stopSingleProfile(profileId)

      if (result.success) {
        toast({
          title: 'Profile Stop',
          description: `${profileName} stopped successfully`
        })
      } else {
        toast({
          title: 'Stop Failed',
          description: result.message || `Failed to stop ${profileName}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error stopping profile:', error)
      toast({
        title: 'Stop Error',
        description: `Error stopping ${profileName}`,
        variant: 'destructive'
      })
    }
  }

  const handleCloseProfile = async (profileId, profileName) => {
    try {
      const result = await window.api.closeSingleProfile(profileId)

      if (result.success) {
        toast({
          title: 'Profile Close',
          description: `${profileName} closed successfully`
        })
      } else {
        toast({
          title: 'Close Failed',
          description: result.message || `Failed to close ${profileName}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error closing profile:', error)
      toast({
        title: 'Close Error',
        description: `Error closing ${profileName}`,
        variant: 'destructive'
      })
    }
  }

  /**
   * Get action button configuration based on profile status
   * @param {Object} profile - Profile object with status
   * @returns {Object|null} Button configuration or null if no action available
   */
  const getActionButtonConfig = (profile) => {
    const status = profile.status

    // Error states - show retry
    if (isErrorStatus(status)) {
      return {
        label: 'Retry',
        action: 'launch',
        icon: RotateCcw,
        className:
          'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700',
        title: 'Retry Launch Profile'
      }
    }

    // Stopped or Idle - show start/play
    if (status === PROFILE_STATUSES.STOPPED || status === PROFILE_STATUSES.IDLE) {
      return {
        label: 'Start',
        action: 'launch',
        icon: Play,
        className:
          'bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700',
        title: 'Start Profile'
      }
    }

    // Paused - show resume
    if (status === PROFILE_STATUSES.PAUSED) {
      return {
        label: 'Resume',
        action: 'resume',
        icon: PlayCircle,
        className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700',
        title: 'Resume Profile'
      }
    }

    // Success or Completed - show restart
    if (status === PROFILE_STATUSES.SUCCESS || status === PROFILE_STATUSES.COMPLETED) {
      return {
        label: 'Restart',
        action: 'launch',
        icon: RotateCcw,
        className:
          'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700',
        title: 'Restart Profile'
      }
    }

    // No action available for current status
    return null
  }

  /**
   * Handle dynamic action button click based on profile status
   * @param {Object} profile - Profile object
   * @param {string} action - Action type (launch, resume, etc.)
   */
  const handleDynamicAction = async (profile, action) => {
    const profileId = profile.id
    const profileName = profile.name

    switch (action) {
      case 'launch':
        await handleLaunchProfile(profileId, profileName)
        break
      case 'resume':
        // TODO: Implement resume functionality when available
        toast({
          title: 'Resume',
          description: `Resume functionality for ${profileName} will be implemented soon`,
          variant: 'default'
        })
        break
      default:
        console.warn(`Unknown action: ${action}`)
        break
    }
  }

  const SortableHeader = ({ tKey, label, className = '' }) => (
    <TableHead onClick={() => handleSort(tKey)} className={cn('px-4', className)}>
      <Button variant="ghost" size="sm" className="h-auto px-2 py-1 -ml-2">
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </Button>
    </TableHead>
  )

  return (
    <ScrollArea className="h-full">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {/* <TableHead className="w-12">
                <Checkbox
                  checked={selectedRows.size === profiles.length && profiles.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                />
              </TableHead> */}
              <SortableHeader tKey="name" label="Profile" className="w-28 text-left" />
              <TableHead className="px-2 w-2 text-center">View</TableHead>
              <SortableHeader tKey="status" label="Status" className="w-10 text-center" />
              <TableHead className="px-2 w-10 text-center">Start/Stop</TableHead>
              <TableHead className="px-2 w-20 text-center">Login</TableHead>
              <TableHead className="px-2 w-32 text-center">Supporter ID</TableHead>
              <TableHead className="px-2 w-20 text-center">Password</TableHead>
              <TableHead className="px-2 w-40 text-center">Card Number</TableHead>
              <TableHead className="px-2 w-14 text-center">Expiry</TableHead>
              <TableHead className="px-2 w-14 text-center">CVV</TableHead>
              <TableHead className="px-2 w-16 text-center">Seats</TableHead>
              <TableHead className="px-2 w-36 text-center">URL</TableHead>
              <TableHead className="px-2 w-32 text-center">Proxy</TableHead>
              {/* <SortableHeader tKey="priority" label="Priority" /> */}
              <TableHead className="px-2 w-20 text-center">Cookies</TableHead>
              <TableHead className="px-2 w-2 text-center">Close</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProfiles.map((profile) => {
              // Access additional fields with fallbacks for regular Profile
              const ticketCount = profile.ticketCount ?? 0

              return (
                <TableRow
                  key={profile.id}
                  data-state={selectedRows.has(profile.id) ? 'selected' : undefined}
                >
                  {/* <TableCell className="p-2">
                    <Checkbox
                      checked={selectedRows.has(profile.id)}
                      onCheckedChange={(checked) => handleSelectRow(profile.id, Boolean(checked))}
                    />
                  </TableCell> */}
                  <TableCell className="p-2 pl-5 text-xs font-medium text-left relative">
                    <div className="truncate max-w-24 cursor-pointer group">
                      {profile.name}
                      {/* Full content overlay on hover */}
                      <div className="absolute left-0 top-0 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap min-w-max">
                        {profile.name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-2 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 h-6 text-xs cursor-pointer"
                      onClick={() => handleBringToFront(profile.id, profile.name)}
                    >
                      View
                    </Button>
                  </TableCell>
                  <TableCell className="p-2 text-center">
                    <div className="group relative">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs text-center h-6 justify-center whitespace-nowrap',
                          getStatusBadgeClass(profile.status)
                        )}
                      >
                        {profile.status}
                      </Badge>
                      <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                        {profile.status}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <div className="truncate max-w-32 cursor-pointer group">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-7 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 cursor-pointer disabled:bg-gray-400 disabled:text-gray-600 disabled:border-gray-400"
                          onClick={() => handleStartProfile(profile.id, profile.name)}
                          disabled={!canResume(profile.status)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        {/* Full content overlay on hover */}
                        <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                          Start Profile
                        </div>
                      </div>

                      <div className="truncate max-w-32 cursor-pointer group">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-7 bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700 cursor-pointer disabled:bg-gray-400 disabled:text-gray-600 disabled:border-gray-400"
                          onClick={() => handleStopProfile(profile.id, profile.name)}
                          disabled={!isStoppable(profile.status)}
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                        {/* Full content overlay on hover */}
                        <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                          Stop Profile
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex items-center justify-center space-x-1">
                      <div className="truncate max-w-32 cursor-pointer group">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'w-8 h-8 cursor-pointer',
                            getLoginButtonClass(profile.loginState)
                          )}
                          title="Login With Selected Profile"
                          onClick={() => handleLoginClick(profile.id, profile.name)}
                          disabled={!canLogin(profile.loginState, profile.status)}
                        >
                          <LogIn className="w-4 h-4" />
                        </Button>
                        {/* Full content overlay on hover */}
                        <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                          Login
                        </div>
                      </div>
                      <div className="truncate max-w-32 cursor-pointer group">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'w-8 h-8 cursor-pointer',
                            getLoginButtonClass(profile.loginState)
                          )}
                          title="Switch profile login"
                          onClick={() => handleSwitchProfileLogin(profile.id, profile.name)}
                          disabled={!canLogin(profile.loginState, profile.status)}
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                        </Button>
                        {/* Full content overlay on hover */}
                        <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                          Switch Login
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="group relative">
                      <Input
                        value={profile.supporterId}
                        onChange={(e) =>
                          handleFieldChange(profile.id, profile.name, 'supporterId', e.target.value)
                        }
                        className="h-7 text-xs w-full truncate"
                      />
                      <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                        {profile.supporterId}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="p-2">
                    <div className="group relative">
                      <Input
                        type="password"
                        value={profile.password}
                        onChange={(e) =>
                          handleFieldChange(profile.id, profile.name, 'password', e.target.value)
                        }
                        className="h-7 text-xs w-full truncate"
                      />
                      <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                        {profile.password}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      <div className="group relative">
                        <Input
                          value={profile.cardInfo}
                          readOnly
                          className="h-7 text-xs w-full truncate"
                        />
                        <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                          {profile.cardInfo}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 hover:bg-accent cursor-pointer p-0 flex-shrink-0"
                        onClick={() => handleCopyCardDetails(profile)}
                        title="Copy card details"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="p-2 text-center">
                    <span className="text-xs truncate block" title={profile.expiry || 'N/A'}>
                      {profile.expiry || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="p-2 text-center">
                    <span className="text-xs truncate block" title={profile.cvv || 'N/A'}>
                      {profile.cvv || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="p-2 text-center">
                    <Select
                      defaultValue={String(profile.seats)}
                      onValueChange={(value) => {
                        const seats = parseInt(value)
                        handleSeatsChange(profile.id, profile.name, seats)
                      }}
                    >
                      <SelectTrigger className="w-full h-7 text-xs cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem className="cursor-pointer" key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="group relative">
                      <Input
                        value={profile.url}
                        onChange={(e) =>
                          handleFieldChange(profile.id, profile.name, 'url', e.target.value)
                        }
                        className="flex-1 h-7 text-xs w-full truncate"
                      />
                      <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                        {profile.url}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="p-2 pl-5 text-xs font-medium text-left relative">
                    <div className="truncate max-w-32 cursor-pointer group">
                      {profile.proxy}
                      {/* Full content overlay on hover */}
                      <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                        {profile.proxy}
                      </div>
                    </div>
                  </TableCell>

                  {/* <TableCell className="p-2">
                      <Select
                        defaultValue={profile.priority}
                        onValueChange={(value) => onPriorityChange(profile.id, value)}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell> */}
                  <TableCell className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-primary h-7 text-xs cursor-pointer w-full"
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-primary h-7 text-xs cursor-pointer w-full"
                      >
                        Update
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      {/* {(() => {
                        const actionConfig = getActionButtonConfig(profile)
                        if (actionConfig) {
                          const IconComponent = actionConfig.icon
                          return (
                            <Button
                              variant="outline"
                              size="icon"
                              className={`w-8 h-8 cursor-pointer disabled:bg-gray-400 disabled:text-gray-600 disabled:border-gray-400 ${actionConfig.className}`}
                              onClick={() => handleDynamicAction(profile, actionConfig.action)}
                              disabled={launchingProfiles.has(profile.id)}
                              title={actionConfig.title}
                            >
                              <IconComponent className="w-4 h-4" />
                            </Button>
                          )
                        }
                        return null
                      })()
                      } */}

                      <div className="truncate max-w-32 cursor-pointer group">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="w-8 h-7 hover:bg-primary cursor-pointer"
                          onClick={() => handleCloseProfile(profile.id, profile.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {/* Full content overlay on hover */}
                        <div className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] whitespace-nowrap pointer-events-none transform -translate-y-full -translate-x-full">
                          Close Profile
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  )
}
