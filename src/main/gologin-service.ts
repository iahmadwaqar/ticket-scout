import { GologinApi, GologinApiParams } from 'gologin';

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
  profileIds: string[];
  token: string;
  gologinProfileIds: string[];
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
  private activeProfiles: Map<string, { gologin: GologinApiParams; result: any }> = new Map();

  constructor() {
    // Initialize GoLogin instance when needed
  }

  /**
   * Launch a single browser profile
   */
  async launchProfile(request: LaunchProfileRequest): Promise<LaunchProfileResponse> {
    try {
      console.log(`[GoLogin Service] Launching profile: ${request.profileName} (ID: ${request.profileId})`);
      
      if (!request.token) {
        return {
          success: false,
          message: 'GoLogin token is required'
        };
      }

      if (!request.gologinProfileId) {
        return {
          success: false,
          message: 'GoLogin profile ID is required'
        };
      }

      // Create GoLogin instance for this profile
      const gologin = new GoLogin({
        token: request.token,
        profile_id: request.gologinProfileId,
      });

      // Start the profile
      const result = await gologin.start();

      if (result.status !== 'success') {
        throw new Error(`GoLogin profile launch failed: ${result.status}`);
      }

      // Store the active profile
      this.activeProfiles.set(request.profileId, { gologin, result });

      console.log(`[GoLogin Service] Successfully launched profile ${request.profileName}`);

      return {
        success: true,
        message: `Profile ${request.profileName} launched successfully`,
        browserUrl: result.wsUrl
      };

    } catch (error) {
      console.error(`[GoLogin Service] Error launching profile ${request.profileName}:`, error);
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
    console.log(`[GoLogin Service] Launching ${request.profileIds.length} profiles`);
    
    const results: Array<{
      profileId: string;
      success: boolean;
      message?: string;
    }> = [];

    // Launch profiles sequentially to avoid overwhelming the system
    for (let i = 0; i < request.profileIds.length; i++) {
      const profileId = request.profileIds[i];
      const gologinProfileId = request.gologinProfileIds[i];
      
      if (!gologinProfileId) {
        results.push({
          profileId,
          success: false,
          message: 'No GoLogin profile ID provided'
        });
        continue;
      }

      try {
        const launchResult = await this.launchProfile({
          profileId,
          profileName: `Profile-${profileId}`,
          gologinProfileId,
          token: request.token
        });

        results.push({
          profileId,
          success: launchResult.success,
          message: launchResult.message
        });

        // Add a small delay between launches to prevent rate limiting
        if (i < request.profileIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        results.push({
          profileId,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount > 0,
      results
    };
  }

  /**
   * Stop a browser profile
   */
  async stopProfile(profileId: string): Promise<LaunchProfileResponse> {
    try {
      console.log(`[GoLogin Service] Stopping profile: ${profileId}`);
      
      const activeProfile = this.activeProfiles.get(profileId);
      if (activeProfile) {
        try {
          await activeProfile.gologin.stop();
          this.activeProfiles.delete(profileId);
          console.log(`[GoLogin Service] Profile ${profileId} stopped successfully`);
        } catch (stopError) {
          console.error(`[GoLogin Service] Error stopping GoLogin profile ${profileId}:`, stopError);
          // Still remove from active profiles even if stop failed
          this.activeProfiles.delete(profileId);
        }
      } else {
        console.log(`[GoLogin Service] Profile ${profileId} was not active`);
      }

      return {
        success: true,
        message: `Profile ${profileId} stopped successfully`
      };

    } catch (error) {
      console.error(`[GoLogin Service] Error stopping profile ${profileId}:`, error);
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
    console.log(`[GoLogin Service] Cleaning up ${this.activeProfiles.size} active profiles`);
    
    const cleanupPromises = Array.from(this.activeProfiles.keys()).map(profileId => 
      this.stopProfile(profileId).catch(error => 
        console.error(`[GoLogin Service] Error cleaning up profile ${profileId}:`, error)
      )
    );
    
    await Promise.allSettled(cleanupPromises);
    this.activeProfiles.clear();
  }
}

// Export singleton instance
export const gologinService = new GoLoginService();