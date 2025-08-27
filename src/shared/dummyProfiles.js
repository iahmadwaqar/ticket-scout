export const dummyProfiles = [
  {
    profileInfo: {
      profileId: 'profile001',
      profileName: 'Concert Hunter',
      createdAt: '2025-01-10T09:00:00Z',
      updatedAt: '2025-08-25T10:30:00Z'
    },
    id: 'a1b2c3d4e5f6789012345678',
    name: 'Profile A',
    supporterId: 'supporter-001',
    status: 'Active',
    loginState: 'Logged In',
    priority: 'High',
    password: 'hunter123',
    seats: 4,
    proxy: 'proxy1.example.com:8080',
    personalInfo: {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@example.com',
      postalCode: '90210',
      pr: 'US'
    },
    cardInfo: {
      number: '****1234',
      type: 'Visa',
      expiry: '12/26',
      cvv: '321'
    },
    browserData: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      uaHalf: 'Mozilla/5.0...',
      uaFull: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
      domain: 'ticketsite1.com',
      homepageUrl: 'https://ticketsite1.com',
      cookies: [],
      priceLevels: 'VIP,Regular',
      areaIds: ['A1', 'B2']
    },
    eventInfo: {
      eventId: 'event001',
      matchUrl: 'https://ticketsite1.com/event/001',
      ticketLimit: 6,
      token: 'token123abc'
    },
    scrapingConfig: {
      targetTickets: 5,
      maxRetries: 3,
      delayBetweenActions: 3000,
      randomBrowsingPages: ['home', 'event', 'checkout'],
      autoLogin: true,
      handleCaptcha: 'auto'
    },
    scrapingState: 'running',
    lastScrapingActivity: '2025-08-25T10:30:00Z',
    operationalState: 'active',
    currentPage: 'event',
    retryCount: 1,
    ticketCount: 2,
    lastActivity: '2025-08-25T10:30:00Z',
    launchedAt: '2025-08-25T10:00:00Z',
    stoppedAt: '',
    errorMessage: ''
  },
  {
    profileInfo: {
      profileId: 'profile002',
      profileName: 'Broadway Fan',
      createdAt: '2025-02-15T08:00:00Z',
      updatedAt: '2025-08-24T18:15:00Z'
    },
    id: 'b2c3d4e5f6789012345678a1',
    name: 'Profile B',
    supporterId: 'supporter-002',
    status: 'Idle',
    loginState: 'Logged Out',
    priority: 'Medium',
    password: '',
    seats: 2,
    proxy: 'proxy2.example.com:8080',
    personalInfo: {
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.j@example.com',
      postalCode: '10001',
      pr: 'US'
    },
    cardInfo: {
      number: '****5678',
      type: 'MasterCard',
      expiry: '05/27',
      cvv: '456'
    },
    browserData: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      uaHalf: 'Mozilla/5.0...',
      uaFull: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
      domain: 'broadwaytickets.com',
      homepageUrl: 'https://broadwaytickets.com',
      cookies: [],
      priceLevels: 'Balcony,Orchestra',
      areaIds: ['C3', 'D4']
    },
    eventInfo: {
      eventId: 'event002',
      matchUrl: 'https://broadwaytickets.com/show/hamilton',
      ticketLimit: 4,
      token: 'token456def'
    },
    scrapingConfig: {
      targetTickets: 2,
      maxRetries: 5,
      delayBetweenActions: 4000,
      randomBrowsingPages: ['listing', 'details', 'checkout'],
      autoLogin: false,
      handleCaptcha: 'manual'
    },
    scrapingState: 'idle',
    lastScrapingActivity: '2025-08-24T18:15:00Z',
    operationalState: 'idle',
    currentPage: 'home',
    retryCount: 0,
    ticketCount: 0,
    lastActivity: '2025-08-24T18:15:00Z',
    launchedAt: '2025-08-24T18:00:00Z',
    stoppedAt: '2025-08-24T18:15:00Z',
    errorMessage: ''
  },
  {
    profileInfo: {
      profileId: 'profile003',
      profileName: 'Festival Seeker',
      createdAt: '2025-03-01T12:00:00Z',
      updatedAt: '2025-08-26T07:30:00Z'
    },
    id: 'c3d4e5f6789012345678a1b2',
    name: 'Profile C',
    supporterId: 'supporter-003',
    status: 'Error',
    loginState: 'Error',
    priority: 'Low',
    password: 'festpass',
    seats: 1,
    proxy: 'proxy3.example.com:8080',
    personalInfo: {
      firstName: 'Carlos',
      lastName: 'Vega',
      email: 'c.vega@example.com',
      postalCode: '60614',
      pr: 'US'
    },
    cardInfo: {
      number: '****9012',
      type: 'Amex',
      expiry: '11/24',
      cvv: '789'
    },
    browserData: {
      userAgent: 'Mozilla/5.0 (Linux; Android 10)',
      uaHalf: 'Mozilla/5.0...',
      uaFull: 'Mozilla/5.0 (Linux; Android 10)...',
      domain: 'festivalzone.com',
      homepageUrl: 'https://festivalzone.com',
      cookies: [],
      priceLevels: 'General Admission',
      areaIds: ['Z1']
    },
    eventInfo: {
      eventId: 'event003',
      matchUrl: 'https://festivalzone.com/fest/ultra',
      ticketLimit: 1,
      token: 'token789ghi'
    },
    scrapingConfig: {
      targetTickets: 1,
      maxRetries: 2,
      delayBetweenActions: 7000,
      randomBrowsingPages: ['main', 'lineup', 'checkout'],
      autoLogin: true,
      handleCaptcha: 'auto'
    },
    scrapingState: 'error',
    lastScrapingActivity: '2025-08-26T07:30:00Z',
    operationalState: 'error',
    currentPage: 'checkout',
    retryCount: 3,
    ticketCount: 0,
    lastActivity: '2025-08-26T07:30:00Z',
    launchedAt: '2025-08-26T07:00:00Z',
    stoppedAt: '2025-08-26T07:30:00Z',
    errorMessage: 'Payment failed'
  },
  {
    profileInfo: {
      profileId: 'profile004',
      profileName: 'Ticket Sniper',
      createdAt: '2025-04-12T14:00:00Z',
      updatedAt: '2025-08-26T09:00:00Z'
    },
    id: 'd4e5f6789012345678a1b2c3',
    name: 'Profile D',
    supporterId: 'supporter-004',
    status: 'Idle',
    loginState: 'Logged Out',
    priority: 'Medium',
    password: '',
    seats: 2,
    proxy: 'proxy4.example.com:8080',
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@example.com',
      postalCode: '12345',
      pr: 'US'
    },
    cardInfo: {
      number: '****3456',
      type: 'Visa',
      expiry: '03/25',
      cvv: '012'
    },
    browserData: {
      userAgent: 'Mozilla/5.0...',
      uaHalf: '...',
      uaFull: '...',
      domain: 'example.com',
      homepageUrl: 'https://example.com',
      cookies: [],
      priceLevels: '...',
      areaIds: []
    },
    eventInfo: {
      eventId: 'event123',
      matchUrl: 'https://...',
      ticketLimit: 4,
      token: 'abc123...'
    },
    scrapingConfig: {
      targetTickets: 10,
      maxRetries: 3,
      delayBetweenActions: 5000,
      randomBrowsingPages: ['page1', 'page2', 'page3'],
      autoLogin: true,
      handleCaptcha: 'auto'
    },
    scrapingState: 'idle',
    lastScrapingActivity: '2025-08-24T13:43:58.000Z',
    operationalState: 'idle',
    currentPage: 'page1',
    retryCount: 0,
    ticketCount: 0,
    lastActivity: '2025-08-24T13:43:58.000Z',
    launchedAt: '2025-08-24T13:43:58.000Z',
    stoppedAt: '2025-08-24T13:43:58.000Z',
    errorMessage: ''
  },
  {
    profileInfo: {
      profileId: 'profile005',
      profileName: 'Mega Buyer',
      createdAt: '2025-05-20T16:45:00Z',
      updatedAt: '2025-08-25T11:11:00Z'
    },
    id: 'e5f6789012345678a1b2c3d4',
    name: 'Profile E',
    supporterId: 'supporter-005',
    status: 'Active',
    loginState: 'Logged In',
    priority: 'High',
    password: 'mega@pass',
    seats: 6,
    proxy: 'proxy5.example.com:8080',
    personalInfo: {
      firstName: 'Diana',
      lastName: 'Lee',
      email: 'd.lee@example.com',
      postalCode: '75001',
      pr: 'US'
    },
    cardInfo: {
      number: '****6789',
      type: 'Discover',
      expiry: '07/28',
      cvv: '234'
    },
    browserData: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
      uaHalf: 'Mozilla/5.0...',
      uaFull: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)...',
      domain: 'ticketpro.com',
      homepageUrl: 'https://ticketpro.com',
      cookies: [],
      priceLevels: 'Premium,Standard',
      areaIds: ['P1', 'P2']
    },
    eventInfo: {
      eventId: 'event005',
      matchUrl: 'https://ticketpro.com/event/buy-now',
      ticketLimit: 8,
      token: 'token999zzz'
    },
    scrapingConfig: {
      targetTickets: 8,
      maxRetries: 4,
      delayBetweenActions: 2000,
      randomBrowsingPages: ['main', 'event', 'payment'],
      autoLogin: true,
      handleCaptcha: 'auto'
    },
    scrapingState: 'running',
    lastScrapingActivity: '2025-08-25T11:11:00Z',
    operationalState: 'active',
    currentPage: 'payment',
    retryCount: 0,
    ticketCount: 3,
    lastActivity: '2025-08-25T11:11:00Z',
    launchedAt: '2025-08-25T10:45:00Z',
    stoppedAt: '',
    errorMessage: ''
  }
];
