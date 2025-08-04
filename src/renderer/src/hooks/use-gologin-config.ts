import { useState, useEffect } from 'react'
import type { GoLoginConfig } from '../../../shared/config'

export function useGoLoginConfig() {
  const [config, setConfig] = useState<GoLoginConfig>({
    token: '',
  })
  const [isLoaded, setIsLoaded] = useState(false)

  // Load configuration on hook initialization
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const savedToken = localStorage.getItem('gologin_token') || ''
      
      const loadedConfig = {
        token: savedToken,
      }
      
      setConfig(loadedConfig)
      setIsLoaded(true)
    } catch (error) {
      console.error('Failed to load GoLogin config:', error)
      setIsLoaded(true)
    }
  }

  const updateConfig = (newConfig: GoLoginConfig) => {
    setConfig(newConfig)
  }

  return {
    config,
    isLoaded,
    updateConfig,
    hasValidConfig: config.token.length > 0
  }
}