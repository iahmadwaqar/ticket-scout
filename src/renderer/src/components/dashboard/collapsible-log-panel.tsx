import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  X,
  Search,
  Filter,
  AlertCircle,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { useLogs } from '@/hooks/use-logs'
import { cn } from '@/lib/utils'
import type { LogEntry } from '@/types'

interface CollapsibleLogPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function CollapsibleLogPanel({ isOpen, onClose }: CollapsibleLogPanelProps) {
  const { logs, isLoading } = useLogs()
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<LogEntry['severity'] | 'All'>('All')
  const [profileFilter, setProfileFilter] = useState<string>('All')
  const [isMaximized, setIsMaximized] = useState(false)

  // Get unique profile IDs for filter dropdown
  const profileIds = Array.from(new Set(logs.map((log) => log.profileId))).sort()

  // Filter logs based on search term, severity, and profile
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profileId.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSeverity = severityFilter === 'All' || log.severity === severityFilter
    const matchesProfile = profileFilter === 'All' || log.profileId === profileFilter

    return matchesSearch && matchesSeverity && matchesProfile
  })

  const getSeverityIcon = (severity: LogEntry['severity']) => {
    switch (severity) {
      case 'Error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'Warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'Info':
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getSeverityBadgeVariant = (severity: LogEntry['severity']) => {
    switch (severity) {
      case 'Error':
        return 'destructive' as const
      case 'Warning':
        return 'secondary' as const
      case 'Info':
        return 'outline' as const
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'l') {
        event.preventDefault()
        onClose()
      }
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 bg-background border-t shadow-lg transition-all duration-300 ease-in-out z-50',
        isMaximized ? 'top-0' : 'top-1/2'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">System Logs</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-blue-600">
              <Info className="w-3 h-3 mr-1" />
              {logs.filter((l) => l.severity === 'Info').length}
            </Badge>
            <Badge variant="secondary" className="text-xs text-yellow-600">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {logs.filter((l) => l.severity === 'Warning').length}
            </Badge>
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              {logs.filter((l) => l.severity === 'Error').length}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
            className="w-8 h-8 p-0"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0"
            title="Close (Ctrl+L)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as any)}>
          <SelectTrigger className="w-32 h-9">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="Info">Info</SelectItem>
            <SelectItem value="Warning">Warning</SelectItem>
            <SelectItem value="Error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Select value={profileFilter} onValueChange={setProfileFilter}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Profiles</SelectItem>
            {profileIds.map((profileId) => (
              <SelectItem key={profileId} value={profileId}>
                {profileId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log Content */}
      <ScrollArea
        className={cn('p-4', isMaximized ? 'h-[calc(100vh-100px)]' : 'h-[calc(50vh-100px)]')}
      >
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {logs.length === 0 ? 'No logs available' : 'No logs match your filters'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 transition-colors border rounded-lg bg-card hover:bg-accent/50"
              >
                <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(log.severity)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getSeverityBadgeVariant(log.severity)} className="text-xs">
                      {log.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {log.profileId}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(log.timestamp)}
                    </span>

                    <p className="text-sm break-words">{log.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
