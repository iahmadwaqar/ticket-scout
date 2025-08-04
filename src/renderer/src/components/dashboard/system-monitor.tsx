import { useState, useTransition } from 'react';
import type { SystemMetrics } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader2 } from 'lucide-react';
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';

interface SystemMonitorProps {
  metrics: SystemMetrics;
}

export default function SystemMonitor({ metrics }: SystemMonitorProps) {
  const [advice, setAdvice] = useState<string>('Click below to get AI-powered advice.');
  const [isPending, startTransition] = useTransition();

  const handleGetAdvice = () => {
    startTransition(async () => {
      // TODO: Implement fetchSystemAdvice for Electron environment
      // const result = await fetchSystemAdvice({
      //   cpuUsage: metrics.cpuUsage,
      //   memoryUsage: metrics.memoryUsage,
      //   concurrencyLimit: metrics.concurrencyLimit,
      //   throttlingState: metrics.throttlingState,
      // });
      const result = "System performance is optimal. Consider increasing concurrency if CPU usage remains low.";
      setAdvice(result);
    });
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>System Monitor</SidebarGroupLabel>
        <SidebarGroupContent className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between items-center">
                  <span className="text-sm font-medium">CPU</span>
                  <span className={`text-sm font-bold ${metrics.cpuUsage > 80 ? 'text-red-500' : ''}`}>{Math.round(metrics.cpuUsage)}%</span>
              </div>
              <Progress value={metrics.cpuUsage} className="h-2" />
            </div>
            <div>
              <div className="mb-1 flex justify-between items-center">
                  <span className="text-sm font-medium">Memory</span>
                  <span className={`text-sm font-bold ${metrics.memoryUsage > 90 ? 'text-red-500' : ''}`}>{Math.round(metrics.memoryUsage)}%</span>
              </div>
              <Progress value={metrics.memoryUsage} className="h-2" />
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Concurrency Limit</span>
                <span className="font-bold">{metrics.concurrencyLimit}</span>
            </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Throttling</span>
                <span className={`font-bold ${metrics.throttlingState !== 'None' ? 'text-orange-500' : ''}`}>{metrics.throttlingState}</span>
            </div>
        </SidebarGroupContent>
      </SidebarGroup>
      
      <SidebarGroup>
        <SidebarGroupLabel>AI Suggestion</SidebarGroupLabel>
        <SidebarGroupContent>
            <Card className="bg-background/50">
                <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground italic h-10">{advice}</p>
                    <Button size="sm" className="w-full mt-2" onClick={handleGetAdvice} disabled={isPending}>
                      {isPending ? <Loader2 className="animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                      {isPending ? 'Analyzing...' : 'Get Suggestion'}
                    </Button>
                </CardContent>
            </Card>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}