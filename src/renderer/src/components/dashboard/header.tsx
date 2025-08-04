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
import { Ticket, Play, RefreshCw, XCircle, Cookie, Pause } from 'lucide-react'

interface DashboardHeaderProps {
  summary: {
    active: number
    errors: number
    successes: number
  }
}

export default function DashboardHeader({ summary }: DashboardHeaderProps) {
  return (
    <header className="flex-shrink-0 border-b bg-card p-2 md:p-3">
      <TooltipProvider>
        <div className="flex flex-col gap-2">
          {/* Row 1: Small items, indicators, and toggles */}
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Ticket className="h-6 w-6 text-primary" />
                <h1 className="text-md md:text-lg font-bold tracking-tight">TicketScout</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="secondary">Active: {summary.active}</Badge>
                <Badge variant={summary.errors > 0 ? 'destructive' : 'secondary'}>
                  Errors: {summary.errors}
                </Badge>
                <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                  Success: {summary.successes}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <Cookie className="h-4 w-4" />
                      <Switch id="cookies-toggle" />
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
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex flex-grow flex-wrap items-center justify-start gap-2 lg:flex-nowrap">
              <Input
                type="number"
                placeholder="Start"
                className="w-20 h-8 text-xs"
                defaultValue={10}
              />
              <Input
                type="number"
                placeholder="Windows"
                className="w-20 h-8 text-xs"
                defaultValue={5}
              />
              <Select defaultValue="1">
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
              <Select defaultValue="chelsea-35">
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chelsea-35">Chelsea - 35</SelectItem>
                  <SelectItem value="arsenal-20">Arsenal - 20</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="model-a">
                <SelectTrigger className="w-28 h-8 text-xs">
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
              <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
                <Play size={14} /> Launch All
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Pause size={14} /> Stop All
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <RefreshCw size={14} /> Cookie Update
              </Button>
              <Button size="sm" className="h-8 text-xs" variant="destructive">
                <XCircle size={14} /> Close All
              </Button>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </header>
  )
}
