import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Search, Filter, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useLogs } from '@/hooks/use-logs'
import type { LogEntry } from '@/types'

interface LogViewerProps {
  className?: string
  maxHeight?: string
}

export default function LogViewer({ className, maxHeight = '400px' }: LogViewerProps) {
  const { logs, isLoading, clearLogs, errorCount, warningCount, infoCount } = useLogs()
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<LogEntry['severity'] | 'All'>('All')
  const [profileFilter, setProfileFilter] = useState<string>('All')

  // Get unique profile IDs for filter dropdown
  const profileIds = useMemo(() => {
    const ids = new Set(logs.map(log => log.profileId))
    return Array.from(ids).sort()
  }, [logs])

  // Filter logs based on search term, severity, and profile
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = searchTerm === '' || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profileId.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesSeverity = severityFilter === 'All' || log.severity === severityFilter
      const matchesProfile = profileFilter === 'All' || log.profileId === profileFilter
      
      return matchesSearch && matchesSeverity && matchesProfile
    })
  }, [logs, searchTerm, severityFilter, profileFilter])

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

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-muted-foreground">Loading logs...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">System Logs</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-blue-600">
              <Info className="w-3 h-3 mr-1" />
              {infoCount}
            </Badge>
            <Badge variant="secondary" className="text-yellow-600">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {warningCount}
            </Badge>
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              {errorCount}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              className="h-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 mt-3">
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
              {profileIds.map(profileId => (
                <SelectItem key={profileId} value={profileId}>
                  {profileId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="px-6 pb-6" style={{ height: maxHeight }}>
          {filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {logs.length === 0 ? 'No logs available' : 'No logs match your filters'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getSeverityIcon(log.severity)}
                  </div>
                  
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
                    </div>
                    
                    <p className="text-sm break-words">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}