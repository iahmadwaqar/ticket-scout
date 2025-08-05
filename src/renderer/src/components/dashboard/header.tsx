import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Ticket, Play, RefreshCw, XCircle, Cookie, Pause, Settings } from 'lucide-react'
import { useGoLoginConfig } from '@/hooks/use-gologin-config'
import { useToast } from '@/hooks/use-toast'

interface DashboardHeaderProps {
  summary: {
    active: number
    errors: number
    successes: number
  }
  onShowSettings?: () => void
}

export default function DashboardHeader({ summary, onShowSettings }: DashboardHeaderProps) {
  const { config, hasValidConfig } = useGoLoginConfig()
  const [startProfile, setStartProfile] = useState(1)
  const [profileCount, setProfileCount] = useState(2)
  const [seats, setSeats] = useState(1)
  const [domain, setDomain] = useState('chelsea-35')
  const [model, setModel] = useState('model-a')
  const [cookies, setCookies] = useState(false)
  const { toast } = useToast()
  const [isLaunching, setIsLaunching] = useState(false)

  const handleLaunchAll = async () => {
    if (!hasValidConfig) {
      toast({
        title: 'Configuration Required',
        description: 'Please configure your GoLogin settings first',
        variant: 'destructive'
      })
      onShowSettings?.()
      return
    }

    setIsLaunching(true)
    try {
      const launchConfig = {
        start: startProfile,
        count: profileCount,
        domain,
        seats,
        model,
        cookies
      }

      const result = await window.api.launchAllProfiles(launchConfig)

      if (result.success) {
        toast({
          title: 'Launch Started',
          description: `Starting launch process for ${profileCount} profiles`
        })
      } else {
        toast({
          title: 'Launch Failed',
          description: result.message || 'Failed to start launch process',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Launch Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
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
          title: 'Stop All Successful',
          description: result.message || 'All profiles have been stopped'
        })
      } else {
        toast({
          title: 'Stop All Failed',
          description: result.message || 'Failed to stop all profiles',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Stop All Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      })
    }
  }

  const handleCloseAll = async () => {
    try {
      const result = await window.api.closeAllProfiles()

      if (result.success) {
        toast({
          title: 'Close All Successful',
          description: result.message || 'All profiles have been closed and cleared'
        })
      } else {
        toast({
          title: 'Close All Failed',
          description: result.message || 'Failed to close all profiles',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Close All Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      })
    }
  }

  return (
    <header className="flex-shrink-0 p-2 border-b bg-card md:p-3">
      <TooltipProvider>
        <div className="flex flex-col gap-2">
          {/* Row 1: Small items, indicators, and toggles */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Ticket className="w-6 h-6 text-primary" />
                <h1 className="font-bold tracking-tight text-md md:text-lg">TicketScout</h1>
              </div>
              {!hasValidConfig && (
                <Badge variant="destructive" className="text-xs">
                  GoLogin API Token Required
                </Badge>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8" onClick={onShowSettings}>
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>GoLogin Settings</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
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
            </div>
          </div>

          {/* Row 2: Large items, inputs, and buttons */}
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex flex-wrap items-center justify-start flex-grow gap-2 lg:flex-nowrap">
              <Input
                type="number"
                placeholder="Start"
                className="w-20 h-8 text-xs"
                value={startProfile}
                onChange={(e) => setStartProfile(parseInt(e.target.value) || 1)}
              />
              <Input
                type="number"
                placeholder="Count"
                className="w-20 h-8 text-xs"
                value={profileCount}
                onChange={(e) => setProfileCount(parseInt(e.target.value) || 1)}
              />
              <Select value={String(seats)} onValueChange={(value) => setSeats(parseInt(value))}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue placeholder="Seats" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} Seat{n > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chelsea-35">Chelsea - 35</SelectItem>
                  <SelectItem value="arsenal-20">Arsenal - 20</SelectItem>
                </SelectContent>
              </Select>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="model-a">Model A</SelectItem>
                  <SelectItem value="model-b">Model B</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 w-28">
                <Slider defaultValue={[50]} max={100} step={1} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-green-600 hover:bg-green-700"
                onClick={handleLaunchAll}
                // disabled={isLaunching || !hasValidConfig}
              >
                <Play size={14} />
                {isLaunching ? 'Launching...' : 'Launch All'}
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-orange-500 hover:bg-orange-600"
                onClick={handleStopAll}
              >
                <Pause size={14} /> Stop All
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-yellow-500 hover:bg-yellow-600"
              >
                <RefreshCw size={14} /> Cookie Update
              </Button>
              <Button 
                size="sm" 
                className="h-8 text-xs" 
                variant="destructive"
                onClick={handleCloseAll}
              >
                <XCircle size={14} /> Close All
              </Button>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </header>
  )
}
