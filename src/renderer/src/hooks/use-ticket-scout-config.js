import { useState, useEffect } from 'react'

export function useTicketScoutConfig() {
  const [config, setConfig] = useState({
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

  const updateConfig = (newConfig) => {
    setConfig(newConfig)
  }

  return {
    config,
    isLoaded,
    updateConfig,
    hasValidConfig: config.token.length > 0
  }
}