import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronUp, ChevronDown, AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-react'
import { useLogs } from '@/hooks/use-logs'
import { cn } from '@/lib/utils'

interface LogStripProps {
  onToggleExpanded: () => void
  isExpanded: boolean
}

export default function LogStrip({ onToggleExpanded, isExpanded }: LogStripProps) {
  const { logs, errorCount, warningCount, infoCount, clearLogs } = useLogs()

  // Get the latest log
  const latestLog = logs[logs.length - 1]

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Error':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      case 'Warning':
        return <AlertTriangle className="w-3 h-3 text-yellow-500" />
      case 'Info':
        return <Info className="w-3 h-3 text-blue-500" />
      default:
        return <Info className="w-3 h-3 text-gray-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="border-t bg-card">
      <div className="flex items-center justify-between px-4 py-2 min-h-[48px]">
        {/* Left side - Latest log */}
        <div className="flex items-center flex-1 min-w-0 gap-3">
          {latestLog ? (
            <>
              <div className="flex-shrink-0">{getSeverityIcon(latestLog.severity)}</div>
              <div className="flex items-center min-w-0 gap-2">
                <Badge variant="outline" className="flex-shrink-0 text-xs">
                  {latestLog.profileId}
                </Badge>
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {formatTimestamp(latestLog.timestamp)}
                </span>
                <span className="text-sm truncate">{latestLog.message}</span>
              </div>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">No logs available</span>
          )}
        </div>

        {/* Center - Log counts */}
        <div className="flex items-center gap-2 mx-4">
          <Badge variant="outline" className="text-xs text-blue-600">
            <Info className="w-3 h-3 mr-1" />
            {infoCount}
          </Badge>
          <Badge variant="secondary" className="text-xs text-yellow-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {warningCount}
          </Badge>
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            {errorCount}
          </Badge>
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            className="w-8 h-8 p-0"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="h-8 px-2"
            title={isExpanded ? 'Collapse logs' : 'Expand logs'}
          >
            <span className="mr-1 text-xs">Logs</span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
          <span className="text-xs">(Ctrl+L to show)</span>
        </div>
      </div>
    </div>
  )
}
