import { logger } from '../../../utils/logger-service.js'
import { navigationService } from '../../navigation/navigation-service.js'
import { textCheckService } from '../../verification/text-check.js'

/**
 * Liverpool Login Implementation
 * Reference from Python: loginData.py → liverpoolLogin()
 */
export async function liverpoolLogin(params) {
  const { cdp, profileId, email, password, proxy, matchUrl, browserData } = params

  try {
    logger.info(profileId, 'Starting Liverpool login process')

    // Step 1: Navigate to Liverpool sign-in page
    const navigationResult = await navigationService.navigateToUrl(
      cdp, 
      profileId, 
      'https://profile.liverpoolfc.com/en/sign-in'
    )

    if (!navigationResult.success) {
      throw new Error(`Navigation failed: ${navigationResult.error}`)
    }

    // Wait 1 second (following Python pattern)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 2: Execute JavaScript login (following Python pattern exactly)
    const jsCode = `
    async function LoginLiverpool(Email, Password) {
        const response = await fetch('https://profile.liverpoolfc.com/api/auth/csrf', {
            method: 'GET',
            credentials: 'include'
        });
        const body = await response.json();
        const csrf = body.csrfToken;
        const postData = {
            email: Email,
            password: Password,
            redirect: 'true',
            csrfToken: csrf,
            callbackUrl: 'https://ticketing.liverpoolfc.com/en-GB/categories/home-tickets',
            json: 'true',
        };
        const postResponse = await fetch('https://profile.liverpoolfc.com/api/auth/callback/credentials', {
            method: 'POST',
            body: new URLSearchParams(postData),
            credentials: 'include'
        });

        const postBody = await postResponse.json();
        console.log(postBody);
        window.location.href='https://ticketing.liverpoolfc.com/en-GB/categories/home-tickets';
    }

    LoginLiverpool("${email}", "${password}");
    `

    logger.info(profileId, 'Executing Liverpool login JavaScript')
    const jsResult = await navigationService.executeJavaScript(cdp, profileId, jsCode)

    if (!jsResult.success) {
      throw new Error(`JavaScript execution failed: ${jsResult.error}`)
    }

    // Step 3: Check for successful login by looking for ticketing page
    const loginSuccess = await textCheckService.textCheck(
      cdp, 
      profileId, 
      "Liverpool FC Ticketing", 
      15
    )

    if (!loginSuccess) {
      return {
        success: false,
        error: 'Login verification failed - Liverpool FC Ticketing text not found',
        profileId: profileId
      }
    }

    // Step 4: Navigate to match URL if provided
    if (matchUrl) {
      logger.info(profileId, `Navigating to match URL: ${matchUrl}`)
      const matchNavResult = await navigationService.navigateToUrl(cdp, profileId, matchUrl)
      
      if (matchNavResult.success) {
        const matchPageSuccess = await textCheckService.textCheck(
          cdp, 
          profileId, 
          'Liverpool Football Club', 
          15
        )
        
        if (!matchPageSuccess) {
          logger.warn(profileId, 'Match page navigation may have failed - Liverpool Football Club text not found')
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

    // Step 6: Extract cookies (following Python pattern)
    logger.info(profileId, 'Extracting cookies from Liverpool session')
    const response = await cdp.Network.getCookies()
    const cookies = response.cookies || []

    logger.info(profileId, `Liverpool login completed successfully - extracted ${cookies.length} cookies`)

    return {
      success: true,
      message: 'Liverpool login completed successfully',
      cookies: cookies,
      profileId: profileId
    }

  } catch (error) {
    logger.error(profileId, `Liverpool login failed: ${error.message}`)
    return {
      success: false,
      error: error.message,
      profileId: profileId
    }
  }
}