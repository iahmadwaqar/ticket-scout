// import { GoLogin } from 'gologin';
import { logger } from './logger-service'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Profile } from '../renderer/src/types'
import type { LaunchAllConfig } from '../shared/ipc-types'
import { BrowserWindow } from 'electron'

export interface LaunchAllProfilesResponse {
  success: boolean;
  message?: string;
}

/**
 * GoLogin service for managing browser profiles
 */
export class GoLoginService {
  private activeProfiles: Map<string, { gologin: any; result: any }> = new Map()
  private mainWindow: BrowserWindow | null = null

  constructor() {
    // Initialize GoLogin instance when needed
  }

  /**
   * Set the main window reference for sending events
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * Load profiles from JSON file
   */
  private loadProfilesFromJson(): Profile[] {
    try {
      const profilesPath = join(__dirname, 'data/profiles.json')
      const profilesData = readFileSync(profilesPath, 'utf-8')
      const parsed = JSON.parse(profilesData)
      return parsed.profiles || []
    } catch (error) {
      logger.error('Global', `Failed to load profiles from JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  }

  /**
   * Filter profiles based on launch configuration
   */
  private filterProfiles(allProfiles: Profile[], config: LaunchAllConfig): Profile[] {
    let filteredProfiles = allProfiles

    // Filter by domain if specified
    if (config.domain && config.domain !== 'all') {
      const domainMap: { [key: string]: string } = {
        'chelsea-35': 'chelsea.com',
        'arsenal-20': 'arsenal.com'
      }
      const targetDomain = domainMap[config.domain] || config.domain
      filteredProfiles = filteredProfiles.filter(profile => 
        profile.url.includes(targetDomain)
      )
    }

    // Filter by seats if specified
    if (config.seats > 0) {
      filteredProfiles = filteredProfiles.filter(profile => 
        profile.seats >= config.seats
      )
    }

    // Apply start and count limits
    const startIndex = Math.max(0, config.start - 1) // Convert to 0-based index
    const endIndex = startIndex + config.count
    
    return filteredProfiles.slice(startIndex, endIndex)
  }

  /**
   * Launch all profiles based on configuration
   */
  async launchAllProfiles(config: LaunchAllConfig): Promise<LaunchAllProfilesResponse> {
    try {
      logger.info('Global', `Starting launch all profiles with config: ${JSON.stringify(config)}`)

      // 1. Load profiles from JSON
      const allProfiles = this.loadProfilesFromJson()
      logger.info('Global', `Loaded ${allProfiles.length} profiles from JSON`)

      // 2. Filter profiles based on config
      const profilesToLaunch = this.filterProfiles(allProfiles, config)
      logger.info('Global', `Filtered to ${profilesToLaunch.length} profiles for launch`)

      if (profilesToLaunch.length === 0) {
        return {
          success: false,
          message: 'No profiles match the specified criteria'
        }
      }

      // 3. Send profiles to dashboard immediately
      if (this.mainWindow) {
        console.log('🚀 Sending profiles-fetched event with profiles:', profilesToLaunch)
        this.mainWindow.webContents.send('profiles-fetched', profilesToLaunch)
      } else {
        console.error('❌ Main window not available to send profiles-fetched event')
      }

      // 4. Start launching profiles with delays
      this.launchProfilesSequentially(profilesToLaunch)

      return {
        success: true,
        message: `Started launching ${profilesToLaunch.length} profiles`
      }

    } catch (error) {
      logger.error('Global', `Failed to launch all profiles: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Launch profiles sequentially with delays and status updates
   */
  private async launchProfilesSequentially(profiles: Profile[]) {
    for (const profile of profiles) {
      try {
        // Start launching this profile
        this.sendProfileStatusUpdate(profile.id, 'Launching', 'Profile started')
        await this.simulateProfileLaunch(profile)
      } catch (error) {
        logger.error(profile.id, `Failed to launch profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
        this.sendProfileStatusUpdate(profile.id, 'Error', error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  /**
   * Simulate profile launch with realistic delays and events
   */
  private async simulateProfileLaunch(profile: Profile) {
    const events = [
      { message: 'Profile started', delay: 10000 },
      { message: 'Navigating to login page', delay: 5000 },
      { message: 'Login successful', delay: 10000 },
      { message: 'Navigating to target page', delay: 15000 }
    ]

    for (const event of events) {
      await new Promise(resolve => setTimeout(resolve, event.delay))
      logger.info(profile.id, event.message)
      this.sendProfileStatusUpdate(profile.id, 'Running', event.message)
    }

    // Final status update
    this.sendProfileStatusUpdate(profile.id, 'Success', 'Profile launched successfully')
    logger.info(profile.id, 'Profile launch completed successfully')
  }

  /**
   * Stop all profiles
   */
  async stopAllProfiles(): Promise<LaunchAllProfilesResponse> {
    try {
      logger.info('Global', 'Starting stop all profiles process')

      // Use GoLogin service to stop all profiles
      // const result = await gologinService.stopAllProfiles()
      const result = {
        success: true,
        message: 'All profiles stopped successfully'
      }
      await new Promise(resolve => setTimeout(resolve, 5000))

      console.log('✅ Stop all profiles result:', result)

      return result
    } catch (error) {
      console.error('❌ Stop all profiles error:', error)
      logger.error(
        'Global',
        `Failed to stop all profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Close all profiles
   */
  async closeAllProfiles(): Promise<LaunchAllProfilesResponse> {
    try {
      logger.info('Global', 'Starting close all profiles process')

      // Use GoLogin service to close all profiles
      // const result = await gologinService.closeAllProfiles()
      const result = {
        success: true,
        message: 'All profiles closed successfully'
      }
      await new Promise(resolve => setTimeout(resolve, 5000))

      console.log('✅ Close all profiles result:', result)

      return result
    } catch (error) {
      console.error('❌ Close all profiles error:', error)
      logger.error(
        'Global',
        `Failed to close all profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  /**
   * Send profile status update to renderer
   */
  private sendProfileStatusUpdate(profileId: string, status: string, message?: string) {
    if (this.mainWindow) {
      console.log('🔄 Sending profile-status-changed event:', { profileId, status, message })
      this.mainWindow.webContents.send('profile-status-changed', {
        profileId,
        status,
        message
      })
    } else {
      console.error('❌ Main window not available to send profile-status-changed event')
    }
  }

  /**
   * Clean up all active profiles
   */
  async cleanup(): Promise<void> {
    logger.operation('Global', 'Cleanup', 'IN_PROGRESS', {
      activeProfileCount: this.activeProfiles.size
    });
    
    const cleanupPromises = Array.from(this.activeProfiles.keys()).map(profileId => 
      this.stopProfile(profileId).catch(error => 
        logger.error(profileId, `Error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`)
      )
    );
    
    await Promise.allSettled(cleanupPromises);
    this.activeProfiles.clear();
    
    logger.operation('Global', 'Cleanup', 'SUCCESS', {
      message: 'All profiles cleaned up'
    });
  }
}

// Export singleton instance
export const gologinService = new GoLoginService();