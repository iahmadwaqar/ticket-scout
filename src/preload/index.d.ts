import { ElectronAPI } from '@electron-toolkit/preload'
import type { ElectronServiceAPI } from '../shared/ipc-types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: ElectronServiceAPI
  }
}
