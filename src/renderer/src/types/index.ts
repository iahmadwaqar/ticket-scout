export type ProfileStatus = 
  | 'Idle' 
  | 'Launching' 
  | 'Ready' 
  | 'LoggedIn' 
  | 'Navigating' 
  | 'Scraping'
  | 'SearchingTickets'
  | 'WaitingForCaptcha'
  | 'InQueue'
  | 'RandomBrowsing'
  | 'SessionExpired'
  | 'RateLimited'
  | 'Success' 
  | 'Error' 
  | 'Stopping' 
  | 'Stopped'
  | 'Running'
  | 'Next';

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

export interface ScrapingConfig {
  targetTickets: number;
  maxRetries: number;
  delayBetweenActions: number;
  randomBrowsingPages: string[];
  autoLogin: boolean;
  handleCaptcha: 'manual' | 'auto';
}

export interface EnhancedProfile extends Profile {
  ticketCount: number;
  lastActivity: string;
  errorMessage?: string;
  operationalState: 'idle' | 'active' | 'error' | 'stopping';
  launchedAt?: string;
  stoppedAt?: string;
  scrapingConfig?: ScrapingConfig;
  lastScrapingActivity?: string;
  scrapingState?: 'idle' | 'active' | 'paused' | 'waiting_user' | 'error';
  currentPage?: string;
  retryCount?: number;
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

export interface ToastMessage {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}