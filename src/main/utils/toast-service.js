
import {
    logValidationError,
    validateToastMessage
  } from '../utils/validation-service.js'


/**
 * Toast notification function (for use by other modules)
 */
export const sendToast = (toast) => {
  try {
    const toastValidation = validateToastMessage(toast)
    if (!toastValidation.isValid) {
      logValidationError('sendToast message', toastValidation)
      return
    }

    const sanitizedToast = toastValidation.sanitizedData

    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('toast-received', sanitizedToast)
      logger.info('Global', `Toast notification sent: ${sanitizedToast.title}`)
    } else {
      logger.warn('Global', 'No main window available for toast notification')
    }
  } catch (error) {
    logger.error(
      'Global',
      `Failed to send toast notification: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
