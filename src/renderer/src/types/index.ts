export type ProfileStatus = 'Idle' | 'Running' | 'Error' | 'Success' | 'Next';
export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface Profile {
  id: string;
  name: string;
  status: ProfileStatus;
  loginState: 'Logged In' | 'Logged Out';
  supporterId: string;
  password?: string;
  cardInfo: string;
  expiry: string;
  cvv: string;
  seats: number;
  url: string;
  proxy: string;
  priority: PriorityLevel;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  concurrencyLimit: number;
  throttlingState: 'None' | 'Active' | 'High';
}

export interface LogEntry {
  id: number;
  timestamp: string;
  profileId: string | 'Global';
  severity: 'Info' | 'Warning' | 'Error';
  message: string;
}