import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Switch } from '@/components/ui/switch.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip.jsx'
import {
  Ticket,
  Play,
  RefreshCw,
  XCircle,
  Cookie,
  Pause,
  Settings,
  Bot,
  SaveAll
} from 'lucide-react'
// import { useTicketScoutConfig } from '@/hooks/use-ticket-scout-config.js'
import { useToast } from '@/hooks/use-toast.js'
import { logger } from '@renderer/lib/logger'

export default function DashboardHeader({ summary, onShowSettings, onProfilesFetched }) {
  const [cookies, setCookies] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [saveAll, setSaveAll] = useState(false)
  const [startProfile, setStartProfile] = useState(0)
  const [profileCount, setProfileCount] = useState(1)
  const [seats, setSeats] = useState(1)
  const [domain, setDomain] = useState('')
  const [speed, setSpeed] = useState(10)
  const [isLaunching, setIsLaunching] = useState(false)
  const [batchConfig, setBatchConfig] = useState({batchSize: 15, batchInterval: 5})
  const [domains, setDomains] = useState([])
  const [isLoadingDomains, setIsLoadingDomains] = useState(false)
  // const { hasValidConfig } = useTicketScoutConfig()
  const { toast } = useToast()

  // Load domains on component mount
  useEffect(() => {
    const loadDomains = async () => {
      setIsLoadingDomains(true)
      try {
        const domainData = await window.api.getDomainInfo()
        setDomains(domainData)
        
        // Set first domain as default if no domain is selected
        if (domainData.length > 0 && !domain) {
          setDomain(domainData[0].domain)
        }
      } catch (error) {
        logger.error('Global', 'Failed to load domains: ' + error.message)
        toast({
          title: 'Domain Load Error',
          description: 'Failed to load available domains',
          variant: 'destructive'
        })
      } finally {
        setIsLoadingDomains(false)
      }
    }

    loadDomains()
  }, [])

  const handleLaunchAll = async () => {
    // if (!hasValidConfig) {
    //   toast({
    //     title: 'Configuration Required',
    //     description: 'Please configure your GoLogin settings first',
    //     variant: 'destructive'
    //   })
    //   onShowSettings?.()
    //   return
    // }

    setIsLaunching(true)
    try {
      const launchConfig = {
        startProfile,
        profileCount,
        seats,
        domain,
        speed,
        cookies,
        autoMode,
        saveAll,
        ...batchConfig
      }

      const result = await window.api.launchAllProfiles(launchConfig)

      if (result.success) {
        const profilesListArray = Array.from(result.profilesList.values())
        toast({
          title: 'Launch Started',
          description: `Starting launch process for ${profilesListArray.length} profiles`
        })
        onProfilesFetched?.(profilesListArray)
      } else {
        toast({
          title: 'Launch Failed',
          description: result.message || 'Failed to launch profiles',
          variant: 'destructive'
        })
      }
    } catch (error) {
      logger.error('Global', 'Error launching profiles:'+ error)
      toast({
        title: 'Launch Error',
        description: 'An error occurred while launching profiles',
        variant: 'destructive'
      })
    } finally {
      setIsLaunching(false)
    }
  }

  const handleStopAll = async () => {
    try {
      const result = await window.api.stopAllProfiles()

      if (result.success) {
        toast({
          title: 'Stop All Started',
          description: result.message || 'Stopping all profiles...'
        })
      } else {
        toast({
          title: 'Stop Failed',
          description: result.message || 'Failed to stop profiles',
          variant: 'destructive'
        })
      }
    } catch (error) {
      logger.error('Global', 'Error stopping profiles:'+ error)
      toast({
        title: 'Stop Error',
        description: 'An error occurred while stopping profiles',
        variant: 'destructive'
      })
    }
  }

  const handleCloseAll = async () => {
    try {
      const result = await window.api.closeAllProfiles()

      if (result.success) {
        toast({
          title: 'Close All Started',
          description: 'Closing all profiles...'
        })
      } else {
        toast({
          title: 'Close Failed',
          description: result.message || 'Failed to close profiles',
          variant: 'destructive'
        })
      }
    } catch (error) {
      logger.error('Global','Error closing profiles:'+ error)
      toast({
        title: 'Close Error',
        description: 'An error occurred while closing profiles',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateCookies = async () => {
    try {
      const result = await window.api.updateCookies()

      if (result.success) {
        toast({
          title: 'Cookies Update Started',
          description: 'Updating cookies...'
        })
      } else {
        toast({
          title: 'Update Cookies Failed',
          description: result.message || 'Failed to update cookies',
          variant: 'destructive'
        })
      }
    } catch (error) {
      logger.error('Global', 'Error updating cookies:'+ error)
      toast({
        title: 'Update Cookies Error',
        description: 'An error occurred while updating cookies',
        variant: 'destructive'
      })
    }
  }

  return (
    <TooltipProvider>
      <header className="flex-shrink-0 p-2 border-b bg-card md:p-4">
        <div className="flex flex-col gap-2">
          {/* Row 1 */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Ticket className="w-6 h-6 text-primary" />
                <h1 className="font-bold tracking-tight text-md md:text-lg">Ticket Scout</h1>
              </div>

              {/* {!hasValidConfig && (
                <Badge variant="destructive" className="text-xs">
                  GoLogin API Token Required
                </Badge>
              )} */}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 cursor-pointer"
                    onClick={onShowSettings}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>TicketScout Settings</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="batch-profile" className="text-xs text-green-500">Batch Interval (Sec)</Label>
              <Input
                type="number"
                className="w-12 h-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={1}
                max={100}
                value={batchConfig.batchInterval}
                onChange={(e) => setBatchConfig({ ...batchConfig, batchInterval: Number(e.target.value) })}
              />
              <Label htmlFor="batch-size" className="text-xs text-green-500">Batch Size</Label>
              <Input
                type="number"
                className="w-12 h-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={1}
                max={100}
                value={batchConfig.batchSize}
                onChange={(e) => setBatchConfig({ ...batchConfig, batchSize: Number(e.target.value) })}
              />
              <div className="items-center hidden gap-2 sm:flex">
                <Badge variant="secondary">Active: {summary.active}</Badge>
                <Badge variant={summary.errors > 0 ? 'destructive' : 'secondary'}>
                  Errors: {summary.errors}
                </Badge>
                <Badge variant="secondary" className="text-green-400 bg-green-600/20">
                  Success: {summary.successes}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <Cookie className="w-4 h-4" />
                      <Switch id="cookies-toggle" checked={cookies} onCheckedChange={setCookies} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enable/Disable Cookie Usage</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-4 h-4" />
                      <Switch
                        id="cookies-toggle"
                        checked={autoMode}
                        onCheckedChange={setAutoMode}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enable/Disable Auto Mode</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <SaveAll className="w-4 h-4" />
                      <Switch id="cookies-toggle" checked={saveAll} onCheckedChange={setSaveAll} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enable/Disable Save All</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex flex-wrap items-center justify-start flex-grow gap-2 lg:flex-nowrap">
              <div className="flex items-center gap-1">
                <label className="text-sm whitespace-nowrap text-green-500">Start:</label>
                <Input
                  type="number"
                  className="w-20 h-8 text-xs"
                  value={startProfile}
                  onChange={(e) => setStartProfile(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-sm whitespace-nowrap text-green-500">Count:</label>
                <Input
                  type="number"
                  className="w-20 h-8 text-xs"
                  value={profileCount}
                  min={1}
                  onChange={(e) => setProfileCount(parseInt(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-1">
                <Select value={String(seats)} onValueChange={(value) => setSeats(parseInt(value))}>
                  <SelectTrigger className="w-24 h-8 text-xs cursor-pointer">
                    <SelectValue placeholder="Seats" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem className="cursor-pointer" key={n} value={String(n)}>
                        {n} Seat{n > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Select value={domain} onValueChange={setDomain} disabled={isLoadingDomains}>
                  <SelectTrigger className="w-32 h-8 text-xs cursor-pointer">
                    <SelectValue placeholder={isLoadingDomains ? "Loading..." : "Domain"} />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((domain) => (
                      <SelectItem className="cursor-pointer" key={domain.domain} value={domain.domain}>
                        {domain.domain} - {domain.count}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 w-38 cursor-pointer">
                <label className="text-sm whitespace-nowrap text-green-500">Speed:</label>
                <Slider
                  value={[speed]}
                  onValueChange={(value) => setSpeed(value[0])}
                  defaultValue={[50]}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-green-600 hover:bg-green-700 cursor-pointer"
                onClick={handleLaunchAll}
                disabled={isLaunching}
              >
                <Play size={14} />
                {isLaunching ? 'Launching...' : 'Launch All'}
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-orange-500 hover:bg-orange-600 cursor-pointer"
                onClick={handleStopAll}
              >
                <Pause size={14} /> Stop All
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-yellow-500 hover:bg-yellow-600 cursor-pointer"
                onClick={handleUpdateCookies}
              >
                <RefreshCw size={14} /> Cookie Update
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs cursor-pointer"
                variant="destructive"
                onClick={handleCloseAll}
              >
                <XCircle size={14} /> Close All
              </Button>
            </div>
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
