import { BrowserWindow } from 'electron'

/**
 * Profile Event Service for broadcasting profile changes to renderer processes
 */
export class ProfileEventService {
  constructor() {
    this.eventCounter = 1
  }

  /**
   * Broadcast profile status update to all renderer processes
   */
  broadcastProfileStatusUpdate(profileId, statusData) {
    const update = {
      id: this.eventCounter++,
      timestamp: new Date().toISOString(),
      profileId,
      ...statusData
    }

    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('profile-status-changed', update)
      }
    })
  }

  /**
   * Broadcast full profile data update
   */
  broadcastProfileDataUpdate(profileId, profileData) {
    const update = {
      id: this.eventCounter++,
      timestamp: new Date().toISOString(),
      profileId,
      profileData
    }

    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('profile-data-changed', update)
      }
    })
  }

  /**
   * Broadcast profile removal
   */
  broadcastProfileRemoved(profileId) {
    const update = {
      id: this.eventCounter++,
      timestamp: new Date().toISOString(),
      profileId
    }

    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('profile-removed', update)
      }
    })
  }

  /**
   * Broadcast when all profiles are closed
   */
  broadcastAllProfilesClosed() {
    const update = {
      id: this.eventCounter++,
      timestamp: new Date().toISOString()
    }

    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('all-profiles-closed', update)
      }
    })
  }
}

export const profileEventService = new ProfileEventService()