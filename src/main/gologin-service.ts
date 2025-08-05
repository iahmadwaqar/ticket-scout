// import { GoLogin } from 'gologin';
import { logger } from './logger-service';

export interface LaunchProfileRequest {
  profileId: string;
  profileName: string;
  gologinProfileId: string;
  token: string;
}

export interface LaunchProfileResponse {
  success: boolean;
  message?: string;
  browserUrl?: string;
}

export interface LaunchMultipleProfilesRequest {
  startProfile: number;
  profileCount: number;
  token: string;
}

export interface LaunchMultipleProfilesResponse {
  success: boolean;
  results: Array<{
    profileId: string;
    success: boolean;
    message?: string;
  }>;
}

/**
 * GoLogin service for managing browser profiles
 */
export class GoLoginService {
  private activeProfiles: Map<string, { gologin: GoLogin; result: any }> = new Map();

  constructor() {
    // Initialize GoLogin instance when needed
  }

  /**
   * Launch a single browser profile
   */
  async launchProfile(request: LaunchProfileRequest): Promise<LaunchProfileResponse> {
    try {
      logger.operation(request.profileId, 'LaunchProfile', 'IN_PROGRESS', {
        profileName: request.profileName,
        gologinProfileId: request.gologinProfileId
      });
      
      if (!request.token) {
        const message = 'GoLogin token is required';
        logger.error(request.profileId, message);
        return {
          success: false,
          message
        };
      }

      if (!request.gologinProfileId) {
        const message = 'GoLogin profile ID is required';
        logger.error(request.profileId, message);
        return {
          success: false,
          message
        };
      }

      // Create GoLogin instance for this profile
      const gologin = new GoLogin({
        token: request.token,
        profile_id: request.gologinProfileId,
      });

      logger.debug(request.profileId, 'Starting GoLogin profile', { gologinProfileId: request.gologinProfileId });

      // Start the profile
      const result = await gologin.start();

      if (result.status !== 'success') {
        throw new Error(`GoLogin profile launch failed: ${result.status}`);
      }

      // Store the active profile
      this.activeProfiles.set(request.profileId, { gologin, result });

      logger.operation(request.profileId, 'LaunchProfile', 'SUCCESS', {
        profileName: request.profileName,
        wsUrl: result.wsUrl
      });

      return {
        success: true,
        message: `Profile ${request.profileName} launched successfully`,
        browserUrl: result.wsUrl
      };

    } catch (error) {
      logger.operation(request.profileId, 'LaunchProfile', 'FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        profileName: request.profileName
      });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Launch multiple browser profiles
   */
  async launchMultipleProfiles(request: LaunchMultipleProfilesRequest): Promise<LaunchMultipleProfilesResponse> {
    logger.operation('Global', 'LaunchMultipleProfiles', 'IN_PROGRESS', {
      profileCount: request.profileCount,
      startProfile: request.startProfile
    });
    
    const results: Array<{
      profileId: string;
      success: boolean;
      message?: string;
    }> = [];

    // Launch profiles sequentially to avoid overwhelming the system
    // for (let i = 0; i < request.profileCount; i++) {
    //   const profileId = request.startProfile + i;
      
    //   if (!gologinProfileId) {
    //     const message = 'No GoLogin profile ID provided';
    //     logger.error(profileId, message);
    //     results.push({
    //       profileId,
    //       success: false,
    //       message
    //     });
    //     continue;
    //   }

    //   try {
    //     const launchResult = await this.launchProfile({
    //       profileId,
    //       profileName: `Profile-${profileId}`,
    //       gologinProfileId,
    //       token: request.token
    //     });

    //     results.push({
    //       profileId,
    //       success: launchResult.success,
    //       message: launchResult.message
    //     });

    //     // Add a small delay between launches to prevent rate limiting
    //     if (i < request.profileIds.length - 1) {
    //       logger.debug('Global', `Waiting 1 second before launching next profile (${i + 2}/${request.profileIds.length})`);
    //       await new Promise(resolve => setTimeout(resolve, 1000));
    //     }

    //   } catch (error) {
    //     const message = error instanceof Error ? error.message : 'Unknown error occurred';
    //     logger.error(profileId, `Failed to launch profile: ${message}`);
    //     results.push({
    //       profileId,
    //       success: false,
    //       message
    //     });
    //   }
    // }

    // const successCount = results.filter(r => r.success).length;
    
    // logger.operation('Global', 'LaunchMultipleProfiles', successCount > 0 ? 'SUCCESS' : 'FAILED', {
    //   successCount,
    //   totalCount: request.profileIds.length,
    //   failedCount: results.length - successCount
    // });
    
    return {
      success: true,
      results: [
        {
          profileId: '123',
          success: true,
          message: 'Profile launched successfully'
        }
      ]
    };
  }

  /**
   * Stop a browser profile
   */
  async stopProfile(profileId: string): Promise<LaunchProfileResponse> {
    try {
      logger.operation(profileId, 'StopProfile', 'IN_PROGRESS');
      
      const activeProfile = this.activeProfiles.get(profileId);
      if (activeProfile) {
        try {
          await activeProfile.gologin.stop();
          this.activeProfiles.delete(profileId);
          logger.operation(profileId, 'StopProfile', 'SUCCESS');
        } catch (stopError) {
          logger.error(profileId, `Error stopping GoLogin profile: ${stopError instanceof Error ? stopError.message : 'Unknown error'}`);
          // Still remove from active profiles even if stop failed
          this.activeProfiles.delete(profileId);
        }
      } else {
        logger.warn(profileId, 'Profile was not active, nothing to stop');
      }

      return {
        success: true,
        message: `Profile ${profileId} stopped successfully`
      };

    } catch (error) {
      logger.operation(profileId, 'StopProfile', 'FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get list of active profiles
   */
  getActiveProfiles(): string[] {
    return Array.from(this.activeProfiles.keys());
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