import { logger } from '../../../utils/logger-service.js'
import { navigationService } from '../../navigation/navigation-service.js'
import { textCheckService } from '../../verification/text-check.js'

/**
 * Leeds United Login Implementation
 * Reference from Python: loginData.py → leedsUnitedLogin()
 */
export async function leedsLogin(params) {
  const { cdp, profileId, email, password, proxy, matchUrl, browserData } = params

  try {
    logger.info(profileId, 'Starting Leeds United login process')

    // Step 1: Execute JavaScript login directly (following Python pattern)
    const jsCode = `
    async function LoginLeeds(email, password) {
        const loginData = new URLSearchParams({
            loginName: email,
            password: password,
            rememberLogin: 'true'
        });
        const response = await fetch('https://tickets.leedsunited.com/handlers/api.ashx/0.1/CrmController.LoginClient', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            credentials: 'include',
            body: loginData
        });

        const data = await response.json();
        window.location.href = 'https://tickets.leedsunited.com/en-gb/categories/home-games';
    }
    LoginLeeds("${email}", "${password}");
    `

    logger.info(profileId, 'Executing Leeds United login JavaScript')
    const jsResult = await navigationService.executeJavaScript(cdp, profileId, jsCode)

    if (!jsResult.success) {
      throw new Error(`JavaScript execution failed: ${jsResult.error}`)
    }

    // Step 2: Check for successful login by looking for email in page content
    const loginSuccess = await textCheckService.textCheck(
      cdp, 
      profileId, 
      '"email"', 
      10
    )

    if (!loginSuccess) {
      return {
        success: false,
        error: 'Login verification failed - email not found in page content',
        profileId: profileId
      }
    }

    // Step 3: Navigate to Home Games page
    const homeUrl = "https://tickets.leedsunited.com/en-gb/categories/home-games"
    logger.info(profileId, 'Navigating to Home Games page')
    const homeNavResult = await navigationService.navigateToUrl(cdp, profileId, homeUrl)
    
    if (!homeNavResult.success) {
      logger.warn(profileId, `Home Games navigation failed: ${homeNavResult.error}`)
    }

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 4: Verify still logged in
    const stillLoggedIn = await textCheckService.textCheck(
      cdp, 
      profileId, 
      '"email"', 
      5
    )

    if (!stillLoggedIn) {
      return {
        success: false,
        error: 'Login verification failed after home page navigation',
        profileId: profileId
      }
    }

    // Step 5: Navigate to match URL if provided
    if (matchUrl) {
      logger.info(profileId, `Navigating to match URL: ${matchUrl}`)
      const matchNavResult = await navigationService.navigateToUrl(cdp, profileId, matchUrl)
      
      if (matchNavResult.success) {
        const matchPageSuccess = await textCheckService.textCheck(
          cdp, 
          profileId, 
          "Leeds United FC", 
          10
        )
        
        if (!matchPageSuccess) {
          logger.warn(profileId, 'Match page navigation may have failed - Leeds United FC text not found')
        } else {
          logger.info(profileId, 'Match page navigated successfully')
        }
      }
    }

    // Step 6: Check for captcha
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

    // Step 7: Extract cookies
    logger.info(profileId, 'Extracting cookies from Leeds United session')
    const response = await cdp.Network.getCookies()
    const cookies = response.cookies || []

    logger.info(profileId, `Leeds United login completed successfully - extracted ${cookies.length} cookies`)

    return {
      success: true,
      message: 'Leeds United login completed successfully',
      cookies: cookies,
      profileId: profileId
    }

  } catch (error) {
    logger.error(profileId, `Leeds United login failed: ${error.message}`)
    return {
      success: false,
      error: error.message,
      profileId: profileId
    }
  }
}