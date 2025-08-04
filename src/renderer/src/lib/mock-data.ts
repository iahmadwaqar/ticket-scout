import type { Profile, SystemMetrics, LogEntry, PriorityLevel } from '@/types';

export const mockProfiles: Profile[] = [
  { id: '1', name: 'Profile-Alpha-001', status: 'Idle', loginState: 'Logged Out', supporterId: 'user123', password: 'password1', cardInfo: '**** **** **** 1234', expiry: '12/25', cvv: '***', seats: 2, url: 'https://example.com/event/1', proxy: '192.168.1.1', priority: 'High' },
  { id: '2', name: 'Profile-Beta-002', status: 'Running', loginState: 'Logged In', supporterId: 'user456', password: 'password2', cardInfo: '**** **** **** 5678', expiry: '11/24', cvv: '***', seats: 1, url: 'https://example.com/event/2', proxy: '192.168.1.2', priority: 'Medium' },
  { id: '3', name: 'Profile-Gamma-003', status: 'Error', loginState: 'Logged Out', supporterId: 'user789', password: 'password3', cardInfo: '**** **** **** 9012', expiry: '01/26', cvv: '***', seats: 4, url: 'https://example.com/event/3', proxy: '192.168.1.3', priority: 'Low' },
  { id: '4', name: 'Profile-Delta-004', status: 'Success', loginState: 'Logged In', supporterId: 'user101', password: 'password4', cardInfo: '**** **** **** 3456', expiry: '06/27', cvv: '***', seats: 2, url: 'https://example.com/event/4', proxy: '192.168.1.4', priority: 'Medium' },
  { id: '5', name: 'Profile-Epsilon-005', status: 'Next', loginState: 'Logged Out', supporterId: 'user112', password: 'password5', cardInfo: '**** **** **** 7890', expiry: '09/25', cvv: '***', seats: 3, url: 'https://example.com/event/5', proxy: '192.168.1.5', priority: 'High' },
  { id: '6', name: 'Profile-Zeta-006', status: 'Idle', loginState: 'Logged Out', supporterId: 'user113', password: 'password6', cardInfo: '**** **** **** 1122', expiry: '03/24', cvv: '***', seats: 1, url: 'https://example.com/event/6', proxy: '192.168.1.6', priority: 'Low' },
  { id: '7', name: 'Profile-Eta-007', status: 'Idle', loginState: 'Logged Out', supporterId: 'user114', password: 'password7', cardInfo: '**** **** **** 3344', expiry: '08/28', cvv: '***', seats: 1, url: 'https://example.com/event/7', proxy: '192.168.1.7', priority: 'Medium' },
];

export const initialSystemMetrics: SystemMetrics = {
  cpuUsage: 25,
  memoryUsage: 40,
  concurrencyLimit: 35,
  throttlingState: 'None',
};

export const initialLogs: LogEntry[] = [
  { id: 1, timestamp: new Date().toLocaleTimeString(), profileId: 'Global', severity: 'Info', message: 'Electron dashboard initialized.' },
  { id: 2, timestamp: new Date().toLocaleTimeString(), profileId: '2', severity: 'Info', message: 'Launch sequence started.' },
  { id: 3, timestamp: new Date().toLocaleTimeString(), profileId: '3', severity: 'Error', message: 'Login failed: Invalid credentials.' },
  { id: 4, timestamp: new Date().toLocaleTimeString(), profileId: '4', severity: 'Info', message: 'Ticket found and secured.' },
];

/**
 * Utility function to generate additional mock profiles for testing
 * Useful for development and testing scenarios
 */
export const generateMockProfile = (id: string, name: string): Profile => ({
  id,
  name,
  status: 'Idle',
  loginState: 'Logged Out',
  supporterId: `user${id}`,
  password: `password${id}`,
  cardInfo: `**** **** **** ${Math.floor(1000 + Math.random() * 9000)}`,
  expiry: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 5) + 24).padStart(2, '0')}`,
  cvv: '***',
  seats: Math.floor(Math.random() * 4) + 1,
  url: `https://example.com/event/${id}`,
  proxy: `192.168.1.${Math.floor(Math.random() * 255)}`,
  priority: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)] as PriorityLevel,
});

/**
 * Utility function to generate mock log entries for testing
 */
export const generateMockLog = (id: number, profileId: string, message: string): LogEntry => ({
  id,
  timestamp: new Date().toLocaleTimeString(),
  profileId,
  severity: ['Info', 'Warning', 'Error'][Math.floor(Math.random() * 3)] as LogEntry['severity'],
  message,
});