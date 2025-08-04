import { useState, useMemo } from 'react';
import type { Profile, PriorityLevel } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LogIn, Copy, RefreshCw, X, ArrowUpDown } from 'lucide-react';

interface ProfileTableProps {
  profiles: Profile[];
  onPriorityChange: (profileId: string, priority: PriorityLevel) => void;
  onFieldChange: (profileId: string, field: keyof Profile, value: any) => void;
}

type SortKey = keyof Profile | '';

export default function ProfileTable({ profiles, onPriorityChange, onFieldChange }: ProfileTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const priorityOrder: Record<PriorityLevel, number> = { 'High': 0, 'Medium': 1, 'Low': 2 };

  const sortedProfiles = useMemo(() => {
    if (!sortKey) return profiles;
    const sorted = [...profiles].sort((a, b) => {
      if (sortKey === 'priority') {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (valA < valB) return -1;
      if (valA > valB) return 1;
      return 0;
    });
    return sortDirection === 'asc' ? sorted : sorted.reverse();
  }, [profiles, sortKey, sortDirection, priorityOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(profiles.map(p => p.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const getStatusBadgeClass = (status: Profile['status']) => {
    switch (status) {
      case 'Running':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Success':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Next':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  
  const SortableHeader = ({ tKey, label }: { tKey: SortKey, label: string }) => (
    <TableHead onClick={() => handleSort(tKey)}>
      <Button variant="ghost" size="sm" className="h-auto px-2 py-1 -ml-2">
        {label}
        <ArrowUpDown className="w-3 h-3 ml-2" />
      </Button>
    </TableHead>
  );

  return (
    <ScrollArea className="h-full">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRows.size === profiles.length && profiles.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                />
              </TableHead>
              <SortableHeader tKey="name" label="Profile" />
              <SortableHeader tKey="status" label="Status" />
              <TableHead>Login</TableHead>
              <TableHead>Supporter ID</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Card/Exchange</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Proxy</TableHead>
              <SortableHeader tKey="priority" label="Priority" />
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProfiles.map((profile) => (
              <TableRow key={profile.id} data-state={selectedRows.has(profile.id) ? 'selected' : undefined}>
                <TableCell className="p-2"><Checkbox checked={selectedRows.has(profile.id)} onCheckedChange={(checked) => handleSelectRow(profile.id, Boolean(checked))} /></TableCell>
                <TableCell className="p-2 text-xs font-medium">{profile.name}</TableCell>
                <TableCell className="p-2"><Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(profile.status))}>{profile.status}</Badge></TableCell>
                <TableCell className="p-2"><Button variant="ghost" size="icon" className="w-8 h-8"><LogIn className="w-4 h-4" /></Button></TableCell>
                <TableCell className="p-2"><Input value={profile.supporterId} onChange={(e) => onFieldChange(profile.id, 'supporterId', e.target.value)} className="h-8 text-xs" /></TableCell>
                <TableCell className="p-2"><Input type="password" value={profile.password} onChange={(e) => onFieldChange(profile.id, 'password', e.target.value)} className="h-8 text-xs" /></TableCell>
                <TableCell className="p-2">
                  <div className="flex items-center gap-1">
                    <Input value={profile.cardInfo} readOnly className="h-8 text-xs" />
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigator.clipboard.writeText(profile.cardInfo)}><Copy className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
                <TableCell className="p-2">
                  <Select defaultValue={String(profile.seats)} onValueChange={(value) => onFieldChange(profile.id, 'seats', parseInt(value))}>
                    <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-2"><Input value={profile.url} onChange={(e) => onFieldChange(profile.id, 'url', e.target.value)} className="w-32 h-8 text-xs" /></TableCell>
                <TableCell className="p-2 text-xs">{profile.proxy}</TableCell>
                <TableCell className="p-2">
                  <Select defaultValue={profile.priority} onValueChange={(value: PriorityLevel) => onPriorityChange(profile.id, value)}>
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-2">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="w-8 h-8"><RefreshCw className="w-4 h-4" /></Button>
                    <Button variant="destructive" size="icon" className="w-8 h-8"><X className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}