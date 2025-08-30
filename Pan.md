I have this Step-by-Step Implementation Plan for Launch All Functionality. I am converting the python project Updated Hunter to electonjs app ticket-scout. It has multiple phases. I want to work on this phase now. Follow these instructions.
1. Don't modify already done code. If you need to modify existing code, make sure to first ask me before doing it. With all required changes you want to do and why they necessary.

2. Don't write tests, run tests or run the app. I will do these manually.

3. Don't assume anything. First study the python file mentioned in the task. Then study relevant files from my electornjs app (ticket-scount) the decide what to do. If you don't see a file ask me to provide it to you.

4. Don't make assumptions. If you don't know what to do, ask me. 

5. Plan everything and them implement it. Don't add a lot of validations, errors checks, logs. Also don't create typescript like types and constans. Just work with pure js so it's easy for me to make any changes without defining types etc.

6. I will modify the plan you draw and after it's final we will proceed with it.

Completed Steps Step 1 to 5.

PHASE 1: API Service Layer Implementation
Step 1: Create API Service Module
What to do:

Create src/main/services/api/ticketshop-api.js
Implement API client for external ticketshop service
Add authentication headers and base URL configuration
Reference from Python: apiData.py
Key functions to replicate:

domainInfo() → Get available domains list
matchData(searchdomain) → Get user profiles for domain
eventInfo(domain) → Get browser configuration data
getCookies() → Get shared cookies
saveCookies(cookies) → Save cookies to backend
Details needed:

Base URL: https://www.ticketsiteshop.co.uk
Authorization header: ticketsiteshop1432
Handle network timeouts and retries
Parse JSON responses properly
Step 2: Create Data Models and Types
What to do:

Create src/main/services/api/models.js
Define TypeScript-like interfaces for API responses
Add data validation helpers
Reference from Python: models.py
Key models to implement:

Match model (user profiles from database)
BrowserData model (browser configuration)
Cookie model (cookie data structure)
Details needed:

Profile fields: email, password, cardnumber, expiry, cvv, eventid, profileid, matchurl, token, proxy, link, cookies
Browser config fields: useragent, uafull, uahalf, domainurl, host, hosturl, homepageurl, pricetypeid, pricelevels, areaids
Validation for required vs optional fields
Step 3: Implement Card Decryption Service
What to do:

Create src/main/services/crypto/card-decrypt.js
Implement AES decryption for card numbers
Reference from Python: decryptCard.py
Key functionality:

AES-256-CBC decryption
Fixed key: ticketsiteshopbarrypsafe@1432 (padded to 32 bytes)
Fixed IV: 6383067782260052
Base64 decoding of encrypted data
PKCS7 padding removal
Details needed:

Use Node.js crypto module
Handle encryption/decryption errors gracefully
Return decrypted card numbers as strings
PHASE 2: Profile Management Enhancement
Step 4: Enhance ProfileStore with API Integration
What to do:

Modify src/main/services/profile/profileStore.js
Replace dummy data with real API calls
Add profile filtering and rotation logic
Reference from Python: hunterInit.py → launchInstances() and add_instance_row()
Key enhancements:

getProfilesFromDB() → Call API instead of using dummy data
Add profile filtering by domain, start index, count
Implement round-robin profile selection logic
Add profile validation before adding to store
Details needed:

Domain filtering logic: extract domain from dropdown selection
Start index handling: slice profiles array from specified start point
Profile rotation: use modulo operator for cycling through profiles
Duplicate profile prevention
Step 5: Add Proxy Configuration Parser
What to do:

Create src/main/services/proxy/proxy-parser.js
Implement proxy format detection and parsing
Reference from Python: launchBrowser.py → proxy configuration logic
Key functionality:

Support two formats: username:password@host:port and host|port
Parse and validate proxy strings
Return standardized proxy objects for GoLogin
Handle proxy-less configurations
Details needed:

Regex patterns for format detection
Error handling for malformed proxy strings
Default "none" mode when no proxy provided
Integration with GoLogin proxy configuration

##Phase 1,2 Implementation Summary (Steps 1-5)
✅ Completed Implementation Overview
Core API and Data Foundation - Successfully completed all 5 steps following Python reference patterns exactly.

Step 1: API Service Module ✅
Created: src/main/services/api/ticketshop-api.js
Features: Complete TicketShop API integration with 5 functions
domainInfo() - List available domains
matchData(domain, email) - Get user profiles for domain
eventInfo(domain) - Get browser configuration data
getCookies() - Retrieve stored cookies
saveCookies(cookies) - Update cookie storage
Config: Added API constants to src/shared/config.js
Pattern: Class-based service with Node.js built-in fetch, minimal error handling
Step 2: Data Models and Types ✅
Created: src/main/services/api/models.js
Models Implemented:
MatchModel - User profiles with card decryption
BrowserDataModel - Browser configuration data
CookieModel - Cookie management
ModelUtils - Utility functions for model arrays
Features:
AES-256-CBC card decryption following Python patterns
Data transformation methods (getFormattedExpiry, etc.)
Full validation with isValid() methods
Python-compatible data handling
Step 3: Card Decryption ✅
Status: SKIPPED (implemented in Step 2)
Reason: Card decryption already integrated in models with reusable cardDecrypt() function
Integration: Available via getDecryptedCardNumber() method in MatchModel
Step 4: Profile Management Enhancement ✅
Enhanced: src/main/services/profile/profileStore.js
Features: Complete API integration following Python hunterInit.py patterns
Dual API calls: matchData() + eventInfo()
Python rotation logic: matches_data[start_index - 1:] + matches_data[:start_index - 1]
Full validation using MatchModel.isValid()
Data transformation from API to internal structure
Card decryption during profile loading
Error throwing (no fallbacks to dummy data)
Config Support: {domain, startProfile, profileCount, seats}
Integration: Ignores dummy profile structure, follows API data structure
Step 5: Proxy Configuration Parser ✅
Created: src/main/services/proxy/proxy-service.js
Features: Complete proxy parsing following Python launchBrowser.py patterns
Format 1: username:password@host:port (authenticated)
Format 2: host|port (simple)
GoLogin integration with createGoLoginOptions()
Fallback to no-proxy for invalid configurations
Proxy statistics and monitoring
Integration: Enhanced ProfileStore with proxy methods:
getGoLoginProxyOptions(profileId)
updateProfileProxy(profileId, proxyString)
getProxyStatistics()
🔧 Technical Implementation Details
Architecture Pattern: ES modules, class-based services, singleton exports
Error Handling: Throw errors, no fallbacks (following user preference)
Validation: Full validation using model methods
Integration: All services work together seamlessly
Python Compliance: Exact replication of Python logic patterns

📁 Files Created/Modified
New Files:
src/main/services/api/ticketshop-api.js (99 lines)
src/main/services/api/models.js (283 lines)
src/main/services/proxy/proxy-service.js (338 lines)
src/main/services/proxy/index.js (2 lines)
Modified Files:
src/shared/config.js (added API and decryption constants)
src/main/services/profile/profileStore.js (enhanced with API integration + proxy support)
🚀 Ready for Next Phase
Current Status: Phase 1 complete, all services validated with get_problems (no errors)
Next Steps: Continue with Phase 2 or subsequent steps from implementation plan
Integration: All Phase 1 components ready for browser automation and GoLogin integration


PHASE 3: Browser Management Enhancement
Step 6: Enhance GoLogin Integration
What to do:

Modify src/main/services/gologin/index.js
Add cookie injection via GoLogin API
Implement proper profile creation/reuse logic
Reference from Python: launchBrowser.py → browserLaunch()
Key enhancements:

Cookie injection before browser launch: POST /browser/{profile_id}/cookies
Profile creation vs reuse logic based on profileid field
Browser configuration with user agent, proxy, resolution
Proper GoLogin token management
Details needed:

GoLogin API endpoint: https://api.gologin.com/browser/{profile_id}/cookies
Cookie format conversion for GoLogin API
Profile options: OS, proxy settings, navigator configuration
Random screen resolution selection
Step 7: Implement Session Bridge Service
What to do:

Create src/main/services/session/session-bridge.js
Implement cookie extraction from browser to HTTP session
Reference from Python: exchangeData.py → sessionConnect()
Key functionality:

Extract cookies from CDP browser session
Create HTTP client (axios/fetch) with extracted cookies
Maintain session state for ticket monitoring
Handle session validation and refresh
Details needed:

CDP cookie extraction: Network.getCookies()
HTTP client configuration with cookies and proxy
Session validation by checking for login markers
Cookie synchronization between browser and HTTP client


PHASE 4: Domain-Specific Login Implementation
Step 8: Create Login Service Factory
What to do:

Create src/main/services/login/login-factory.js
Implement domain-specific login strategies
Reference from Python: loginData.py
Key login implementations:

Liverpool: API-based login with CSRF token
Manchester United: Form-based login with element manipulation
Leeds United: API-based login with direct credential posting
Details needed:

Liverpool: GET /api/auth/csrf, POST /api/auth/callback/credentials
Man Utd: Element selectors #Username, #Password, form submission
Leeds: POST /handlers/api.ashx/0.1/CrmController.LoginClient
Response validation and error handling per domain
Step 9: Implement Text Verification Service
What to do:

Create src/main/services/verification/text-check.js
Implement page content verification
Reference from Python: textVerify.py → textCheck()
Key functionality:

Wait for specific text to appear on page
Configurable timeout and polling interval
Use CDP Runtime.evaluate to check page content
Return boolean for text presence
Details needed:

Default timeout: 40 seconds, interval: 3 seconds
CDP expression: document.documentElement.outerHTML
Text search within page source
Timeout handling and graceful failures


PHASE 5: Ticket Monitoring Implementation
Step 10: Create Ticket Monitoring Engine
What to do:

Create src/main/services/monitoring/ticket-engine.js
Implement continuous ticket availability checking
Reference from Python: exchangeData.py → initCrawler()
Key functionality:

Polling loop with configurable intervals
HTTP requests to match pages
Parse eventPricing JSON for ticket availability
Handle queue-it redirects and captcha detection
Details needed:

Default speed: 1-2 second intervals with jitter
URL pattern: GET match page, parse response
Queue-it handling: detect decodeURIComponent redirects
Ticket detection: check eventPricing = {}; vs populated object
Step 11: Implement Ticket Purchase Logic
What to do:

Create src/main/services/purchase/ticket-purchase.js
Implement seat reservation and purchase flow
Reference from Python: exchangeData.py → ticket POST request
Key functionality:

POST to SetEventTickets API endpoint
Area and seat selection logic
Purchase attempt with retry on 400 errors
Success handling and notification
Details needed:

API endpoint: /handlers/api.ashx/0.1/TicketingController.SetEventTickets
Request payload: eventId, priceLevels, seatsToSet, areas
Response handling: 200 (success), 400 (retry), 403/406 (errors)
Navigate to order page on success: /Order.aspx


PHASE 6: UI Integration and Final Assembly
Step 12: Update Profile Handlers
What to do:

Modify src/main/handlers/profile-handlers.js
Integrate all new services into launch flow
Reference from Python: hunterInit.py → launchInstances() complete flow
Key integrations:

API calls for profile and config data
Domain validation and selection
Cookie loading and integration
Batch processing with proper error handling
Details needed:

Config validation: domain selection, profile count, seat count
Error aggregation and reporting
Progress tracking for UI updates
Resource cleanup on failures
Step 13: Enhance UI Controls
What to do:

Update src/renderer/src/components/dashboard/header.jsx
Add domain dropdown with real data
Integrate with new backend services
Reference from Python: hunterInit.py → setupUi()
Key UI enhancements:

Domain dropdown populated from API
Profile count and start index controls
Speed slider for monitoring intervals
Checkbox controls for cookies, auto mode, save all
Details needed:

Domain format: "Liverpool - 5" (domain - count)
Range controls with validation
Real-time status updates during launch
Error display and user feedback
Step 14: Implement Cookie Management
What to do:

Create src/main/services/cookies/cookie-manager.js
Add cookie update and management functionality
Reference from Python: updateCookies.py and cookie-related functions
Key functionality:

Global cookie updates across all profiles
Individual profile cookie updates
Cookie saving and loading from API
Cookie format conversion for different systems
Details needed:

Cookie update flow: fetch from API, inject into browsers
Auto-start functionality after cookie updates
Cookie filtering and validation
Error handling for failed cookie operations


PHASE 7: Resource Management and Cleanup
Step 15: Enhance Cleanup Manager
What to do:

Update src/main/services/cleanup-manager.js
Add comprehensive resource cleanup
Reference from Python: hunterInit.py → closeInstance()
Key cleanup enhancements:

HTTP session cleanup
API connection termination
Monitoring loop cancellation
Profile state reset
Details needed:

Graceful monitoring loop shutdown
Session cleanup and resource deallocation
Error handling during cleanup
Status reporting during cleanup process
This comprehensive plan addresses all the key functionality from the Python project while integrating with your existing Electron.js architecture. Each step builds upon the previous ones, ensuring a systematic implementation that maintains your current codebase structure and follows your project's design patterns.