import { logger } from '../../../utils/logger-service.js'
import { navigationService } from '../../navigation/navigation-service.js'
import { textCheckService } from '../../verification/text-check.js'

/**
 * Manchester United Login Implementation
 * Reference from Python: loginData.py → manutdLogin()
 */
export async function manutdLogin(params) {
  const { cdp, profileId, email, password, proxy, matchUrl, browserData } = params

  try {
    logger.info(profileId, 'Starting Manchester United login process')

    // Step 1: Navigate to Manchester United login page
    const tempUrl = "https://tickets.manutd.com/idmSso/auth?act=login&next=en-GB%2Fcategories%2Fhome-tickets"
    const navigationResult = await navigationService.navigateToUrl(cdp, profileId, tempUrl)

    if (!navigationResult.success) {
      throw new Error(`Navigation failed: ${navigationResult.error}`)
    }

    // Wait 2 seconds (following Python pattern)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 2: Check for username field and fill it
    const usernameTag = "#Username"
    const passwordTag = "#Password"

    const usernameExists = await textCheckService.elementExists(cdp, profileId, usernameTag, 15)
    
    if (usernameExists) {
      // Fill username field
      logger.info(profileId, 'Filling username field')
      const usernameResult = await navigationService.fillField(cdp, profileId, usernameTag, email)
      
      if (!usernameResult.success) {
        return {
          success: false,
          error: 'Failed to fill username field',
          profileId: profileId
        }
      }

      // Check for password field and fill it
      const passwordExists = await textCheckService.elementExists(cdp, profileId, passwordTag, 15)
      
      if (passwordExists) {
        logger.info(profileId, 'Filling password field')
        const passwordResult = await navigationService.fillField(cdp, profileId, passwordTag, password)
        
        if (!passwordResult.success) {
          return {
            success: false,
            error: 'Failed to fill password field', 
            profileId: profileId
          }
        }

        logger.info(profileId, 'Credentials filled successfully - manual submission required')
        return {
          success: false,
          error: 'Manual intervention required - please submit the form manually',
          requiresManualSubmission: true,
          profileId: profileId
        }

      } else {
        return {
          success: false,
          error: 'Password field not found',
          profileId: profileId
        }
      }

    } else {
      // Check if already logged in by looking for email in page
      const alreadyLoggedIn = await textCheckService.textCheck(cdp, profileId, email, 5)
      
      if (alreadyLoggedIn) {
        logger.info(profileId, 'Already logged in to Manchester United')
      } else {
        return {
          success: false,
          error: 'Username field not found and not already logged in',
          profileId: profileId
        }
      }
    }

    // Step 3: Navigate to home tickets page
    const homeUrl = "https://tickets.manutd.com/en-GB/categories/home-tickets"
    logger.info(profileId, 'Navigating to home tickets page')
    const homeNavResult = await navigationService.navigateToUrl(cdp, profileId, homeUrl)
    
    if (!homeNavResult.success) {
      logger.warn(profileId, `Home page navigation failed: ${homeNavResult.error}`)
    }

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check for "Buy Man Utd Tickets" text
    const homePageSuccess = await textCheckService.textCheck(cdp, profileId, 'Buy Man Utd Tickets', 10)
    if (!homePageSuccess) {
      logger.warn(profileId, 'Home page verification failed - Buy Man Utd Tickets text not found')
    }

    // Wait 2 more seconds
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 4: Navigate to match URL if provided
    if (matchUrl) {
      logger.info(profileId, `Navigating to match URL: ${matchUrl}`)
      const matchNavResult = await navigationService.navigateToUrl(cdp, profileId, matchUrl)
      
      if (matchNavResult.success) {
        const matchPageSuccess = await textCheckService.textCheck(
          cdp, 
          profileId, 
          'Tickets for Manchester', 
          15
        )
        
        if (!matchPageSuccess) {
          logger.warn(profileId, 'Match page navigation may have failed')
        } else {
          logger.info(profileId, 'Match page navigated successfully')
        }
      }
    }

    // Step 5: Check for captcha
    const hasCaptcha = await textCheckService.textCheck(
      cdp, 
      profileId, 
      'geo.captcha-delivery', 
      4
    )

    if (hasCaptcha) {
      return {
        success: false,
        error: 'Captcha detected',
        requiresCaptcha: true,
        profileId: profileId
      }
    }

    // Step 6: Extract cookies
    logger.info(profileId, 'Extracting cookies from Manchester United session')
    const response = await cdp.Network.getCookies()
    const cookies = response.cookies || []

    logger.info(profileId, `Manchester United login completed successfully - extracted ${cookies.length} cookies`)

    return {
      success: true,
      message: 'Manchester United login completed successfully',
      cookies: cookies,
      profileId: profileId
    }

  } catch (error) {
    logger.error(profileId, `Manchester United login failed: ${error.message}`)
    return {
      success: false,
      error: error.message,
      profileId: profileId
    }
  }
}