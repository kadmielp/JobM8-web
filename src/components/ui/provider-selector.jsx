import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ProviderSelector({ 
  selectedProvider, 
  onProviderChange, 
  title = "Select AI Provider",
  description = "Choose which AI provider to use for this feature",
  showCard = true,
  className = ""
}) {
  const [settings, setSettings] = useState({ providers: {} })
  const [enabledProviders, setEnabledProviders] = useState([])

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('openJobSettings')
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings)
      setSettings(parsedSettings)
      
      // Get enabled providers
      const enabled = Object.entries(parsedSettings.providers || {})
        .filter(([_, config]) => config.enabled)
        .map(([provider, config]) => ({
          key: provider,
          name: getProviderDisplayName(provider),
          config
        }))
      
      setEnabledProviders(enabled)
      
      // Auto-select first enabled provider if none selected
      if (!selectedProvider && enabled.length > 0) {
        onProviderChange(enabled[0].key)
      }
    }
  }, [selectedProvider, onProviderChange])

  const getProviderDisplayName = (provider) => {
    const names = {
      'ollama': 'Ollama (Local)',
      'openai': 'OpenAI',
      'gemini': 'Google Gemini',
      'maritaca': 'Maritaca',
      'custom': 'Custom Provider'
    }
    return names[provider] || provider
  }



  if (enabledProviders.length === 0) {
    return (
      <div className={`text-center p-4 text-muted-foreground ${className}`}>
        <p>No AI providers enabled. Please enable at least one provider in Settings.</p>
      </div>
    )
  }

  if (enabledProviders.length === 1) {
    // If only one provider is enabled, don't show selector
    return null
  }

  const content = (
    <div className="space-y-2">
      <Label htmlFor="provider-select">{title}</Label>
      <Select value={selectedProvider} onValueChange={onProviderChange}>
        <SelectTrigger id="provider-select">
          <SelectValue placeholder="Select a provider" />
        </SelectTrigger>
        <SelectContent>
          {enabledProviders.map((provider) => (
            <SelectItem key={provider.key} value={provider.key}>
              {provider.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )

  if (showCard) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {content}
    </div>
  )
}
