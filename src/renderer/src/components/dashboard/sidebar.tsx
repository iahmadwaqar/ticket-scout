import { useMemo } from 'react';
import type { LogEntry, SystemMetrics, Profile } from '@/types';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuBadge
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import SystemMonitor from './system-monitor';
import { BookText, BarChart } from 'lucide-react';

interface DashboardSidebarProps {
  systemMetrics: SystemMetrics;
  logs: LogEntry[];
  profiles: Profile[];
}

export default function DashboardSidebar({ systemMetrics, logs, profiles }: DashboardSidebarProps) {
    const unreadLogCount = logs.length;
    const errorCount = logs.filter(log => log.severity === 'Error').length;

    const batchSummary = useMemo(() => {
        const launching = profiles.filter(p => p.status === 'Running').length;
        const succeeded = profiles.filter(p => p.status === 'Success').length;
        const failed = profiles.filter(p => p.status === 'Error').length;
        return { launching, succeeded, failed };
    }, [profiles]);
    
    const prioritySummary = useMemo(() => {
        const high = profiles.filter(p => p.priority === 'High').length;
        const medium = profiles.filter(p => p.priority === 'Medium').length;
        const low = profiles.filter(p => p.priority === 'Low').length;
        return { high, medium, low };
    }, [profiles]);

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
            <SidebarMenuItem>
                 <SidebarMenuButton tooltip="Logs">
                    <BookText/>
                    <span>Logs</span>
                    {unreadLogCount > 0 && <SidebarMenuBadge>{unreadLogCount}</SidebarMenuBadge>}
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="System Monitor">
                    <BarChart/>
                    <span>System</span>
                    {errorCount > 0 && <SidebarMenuBadge>{errorCount}</SidebarMenuBadge>}
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <ScrollArea className="h-full px-2">
            <SidebarGroup>
                <SidebarGroupLabel>Global Logs</SidebarGroupLabel>
                <SidebarGroupContent>
                    <ScrollArea className="h-96 w-full rounded-md border p-2 bg-background">
                    {logs.map(log => (
                        <div key={log.id} className="text-xs mb-1 font-code">
                            <span className="text-muted-foreground mr-2">{log.timestamp}</span>
                            <span className={`${log.severity === 'Error' ? 'text-red-500' : 'text-foreground'}`}>
                                [{log.profileId === 'Global' ? 'Global' : `P-${log.profileId}`}] {log.message}
                            </span>
                        </div>
                    ))}
                    </ScrollArea>
                </SidebarGroupContent>
            </SidebarGroup>
            <SystemMonitor metrics={systemMetrics} />
            <SidebarGroup>
                <SidebarGroupLabel>Batch Progress</SidebarGroupLabel>
                <SidebarGroupContent className="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <p className="text-xs text-muted-foreground">Launching</p>
                        <p className="font-bold text-lg">{batchSummary.launching}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Succeeded</p>
                        <p className="font-bold text-lg text-green-500">{batchSummary.succeeded}</p>
                    </div>
                     <div>
                        <p className="text-xs text-muted-foreground">Failed</p>
                        <p className="font-bold text-lg text-red-500">{batchSummary.failed}</p>
                    </div>
                </SidebarGroupContent>
            </SidebarGroup>
             <SidebarGroup>
                <SidebarGroupLabel>Priority Overview</SidebarGroupLabel>
                <SidebarGroupContent className="space-y-1">
                    <div className="flex justify-between items-center text-sm"><span>High</span> <Badge variant="destructive">{prioritySummary.high}</Badge></div>
                    <div className="flex justify-between items-center text-sm"><span>Medium</span> <Badge variant="secondary">{prioritySummary.medium}</Badge></div>
                    <div className="flex justify-between items-center text-sm"><span>Low</span> <Badge>{prioritySummary.low}</Badge></div>
                </SidebarGroupContent>
            </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}