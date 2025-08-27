import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Save } from 'lucide-react'
import { toast } from '@/hooks/use-toast.js'

export default function GoLoginSettings() {
  const [config, setConfig] = useState({
    token: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  // Load configuration on component mount
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      // Load from localStorage for now - you can implement proper storage later
      const savedToken = localStorage.getItem('gologin_token') || ''
      
      const loadedConfig = {
        token: savedToken,
      }
      
      setConfig(loadedConfig)
    } catch (error) {
      console.error('Failed to load GoLogin config:', error)
      toast({
        title: 'Error',
        description: 'Failed to load GoLogin configuration',
        variant: 'destructive'
      })
    }
  }

  const saveConfig = async () => {
    setIsLoading(true)
    try {
      // Save to localStorage for now - you can implement proper storage later
      localStorage.setItem('gologin_token', config.token)
      
      toast({
        title: 'Success',
        description: 'GoLogin configuration saved successfully'
      })
    } catch (error) {
      console.error('Failed to save GoLogin config:', error)
      toast({
        title: 'Error',
        description: 'Failed to save GoLogin configuration',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>GoLogin Configuration</CardTitle>
          <CardDescription>
            Configure your GoLogin API token and profile mappings for browser automation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gologin-token">GoLogin API Token</Label>
            <Input
              id="gologin-token"
              type="password"
              placeholder="Enter your GoLogin API token"
              value={config.token}
              onChange={(e) => setConfig(prev => ({ ...prev, token: e.target.value }))}
            />
            <p className="text-sm text-muted-foreground">
              You can find your API token in your GoLogin dashboard under API settings
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  )
}