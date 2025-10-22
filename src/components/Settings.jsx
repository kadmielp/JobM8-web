import { useState, useEffect } from 'react'
import { Save, Key, Shield, Bell, Palette, Database, Download, Upload, Trash2, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { AIService } from '@/services/aiService'

export function Settings() {
  const { toast } = useToast()
  const [availableModels, setAvailableModels] = useState({})
  const [isTestingConnection, setIsTestingConnection] = useState({})
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const [settings, setSettings] = useState({
    // AI Provider Settings
    providers: {
      ollama: {
        host: 'http://localhost:11434',
        model: '',
        enabled: false
      },
      openai: {
        apiKey: '',
        model: '',
        enabled: true
      },
      gemini: {
        apiKey: '',
        model: '',
        enabled: false
      },
      maritaca: {
        baseUrl: 'https://chat.maritaca.ai/api',
        apiKey: '',
        model: '',
        enabled: false
      },
      custom: {
        baseUrl: '',
        apiKey: '',
        model: '',
        enabled: false
      }
    },
    // App Settings
    theme: 'system',
    notifications: {
      followUpReminders: true,
      applicationDeadlines: true,
      interviewReminders: true,
      weeklyReports: false
    },
    privacy: {
      dataRetention: '1year',
      autoBackup: true,
      encryptionEnabled: true
    },
    // Resume Settings
    resumeDefaults: {
      template: 'modern',
      tone: 'professional',
      length: 'standard'
    }
  })

  useEffect(() => {
    try {
      // Load settings from localStorage
      const savedSettings = localStorage.getItem('openJobSettings')
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }

      // Load available models from localStorage
      const savedModels = localStorage.getItem('jobm8_available_models')
      if (savedModels) {
        setAvailableModels(JSON.parse(savedModels))
      }

      setIsLoading(false)
    } catch (err) {
      console.error('Error loading settings:', err)
      setError(err.message)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('openJobSettings', JSON.stringify(settings))
    }
  }, [settings, isLoading])

  useEffect(() => {
    if (Object.keys(availableModels).length > 0) {
      localStorage.setItem('jobm8_available_models', JSON.stringify(availableModels))
    }
  }, [availableModels])

  const saveSettings = () => {
    localStorage.setItem('openJobSettings', JSON.stringify(settings))
    toast({
      title: "Settings Saved",
      description: "Your settings have been saved successfully.",
    })
  }

  const updateProvider = (provider, field, value) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: {
          ...prev.providers[provider],
          [field]: value
        }
      }
    }))
  }

  // Safe access to provider settings with fallbacks
  const getProviderSetting = (provider, field) => {
    return settings?.providers?.[provider]?.[field] ?? ''
  }

  const isProviderEnabled = (provider) => {
    return settings?.providers?.[provider]?.enabled ?? false
  }

  const updateNotification = (key, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }))
  }

  const updatePrivacy = (key, value) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }))
  }

  const updateResumeDefault = (key, value) => {
    setSettings(prev => ({
      ...prev,
      resumeDefaults: {
        ...prev.resumeDefaults,
        [key]: value
      }
    }))
  }

  const testConnection = async (provider) => {
    const providerKey = provider.toLowerCase()
    
    setIsTestingConnection(prev => ({ ...prev, [providerKey]: true }))
    
    toast({
      title: "Testing Connection",
      description: `Testing connection to ${provider}...`,
    })
    
    try {
      const result = await AIService.testConnection(providerKey, settings.providers[providerKey])
      
      if (result.success) {
        // Update available models
        setAvailableModels(prev => ({
          ...prev,
          [providerKey]: result.models
        }))
        
        // If models were found, optionally update the selected model to the first available one
        if (result.models.length > 0 && !settings.providers[providerKey].model) {
          setSettings(prev => ({
            ...prev,
            providers: {
              ...prev.providers,
              [providerKey]: {
                ...prev.providers[providerKey],
                model: result.models[0].id
              }
            }
          }))
        }
        
        toast({
          title: "Connection Successful",
          description: `Connected to ${provider}! Found ${result.models.length} available models.`,
        })
      } else {
        toast({
          title: "Connection Failed",
          description: `Failed to connect to ${provider}: ${result.error}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: `Error testing ${provider}: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setIsTestingConnection(prev => ({ ...prev, [providerKey]: false }))
    }
  }

  const fetchModelsOnly = async (provider) => {
    const providerKey = provider.toLowerCase()
    
    setIsTestingConnection(prev => ({ ...prev, [providerKey]: true }))
    
    toast({
      title: "Fetching Models",
      description: `Fetching available models from ${provider}...`,
    })
    
    try {
      const result = await AIService.testConnection(providerKey, settings.providers[providerKey])
      
      if (result.success) {
        // Update available models
        setAvailableModels(prev => ({
          ...prev,
          [providerKey]: result.models
        }))
        
        toast({
          title: "Models Fetched",
          description: `Found ${result.models.length} available models from ${provider}.`,
        })
      } else {
        toast({
          title: "Failed to Fetch Models",
          description: `Failed to fetch models from ${provider}: ${result.error}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error Fetching Models",
        description: `Error fetching models from ${provider}: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setIsTestingConnection(prev => ({ ...prev, [providerKey]: false }))
    }
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'openjob-settings.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importSettings = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result)
          setSettings(importedSettings)
          toast({
            title: "Settings Imported",
            description: "Settings have been imported successfully.",
          })
        } catch (error) {
          toast({
            title: "Import Error",
            description: "Failed to import settings. Please check the file format.",
            variant: "destructive"
          })
        }
      }
      reader.readAsText(file)
    }
  }

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.clear()
      toast({
        title: "Data Cleared",
        description: "All application data has been cleared.",
      })
    }
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading settings...</span>
          </div>
        </div>
      )}
      

      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading settings</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content - Only show when not loading */}
      {!isLoading && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Configure your OpenJob application preferences</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportSettings}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <label>
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={importSettings}
                  className="hidden"
                />
              </label>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </div>

          <Tabs defaultValue="providers" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="providers">AI Providers</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="privacy">Privacy & Security</TabsTrigger>
              <TabsTrigger value="data">Data Management</TabsTrigger>
            </TabsList>

            {/* AI Providers */}
            <TabsContent value="providers">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Provider Selection</CardTitle>
                    <CardDescription>Enable and configure the AI providers you want to use. You'll be able to choose which provider to use for each AI feature.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>• Enable the providers you want to use by toggling the switches below</p>
                      <p>• Configure API keys and models for each enabled provider</p>
                      <p>• When using AI features, you'll be prompted to select your preferred provider</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Ollama Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ollama (Local AI)</CardTitle>
                    <CardDescription>Configure your local Ollama installation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isProviderEnabled('ollama')}
                        onCheckedChange={(checked) => updateProvider('ollama', 'enabled', checked)}
                      />
                      <Label>Enable Ollama</Label>
                    </div>
                    <div>
                      <Label>Host URL</Label>
                      <Input
                        value={getProviderSetting('ollama', 'host')}
                        onChange={(e) => updateProvider('ollama', 'host', e.target.value)}
                        placeholder="http://localhost:11434"
                      />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Select value={getProviderSetting('ollama', 'model')} onValueChange={(value) => updateProvider('ollama', 'model', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.ollama && availableModels.ollama.length > 0 && (
                            availableModels.ollama.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {availableModels.ollama && availableModels.ollama.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {availableModels.ollama.length} models available
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => testConnection('Ollama')}
                      disabled={isTestingConnection.ollama}
                    >
                      {isTestingConnection.ollama && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isTestingConnection.ollama ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </CardContent>
                </Card>

                {/* OpenAI Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>OpenAI</CardTitle>
                    <CardDescription>Configure OpenAI API access</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isProviderEnabled('openai')}
                        onCheckedChange={(checked) => updateProvider('openai', 'enabled', checked)}
                      />
                      <Label>Enable OpenAI</Label>
                    </div>
                    <div>
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={getProviderSetting('openai', 'apiKey')}
                        onChange={(e) => updateProvider('openai', 'apiKey', e.target.value)}
                        placeholder="sk-..."
                      />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Select value={getProviderSetting('openai', 'model')} onValueChange={(value) => updateProvider('openai', 'model', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.openai && availableModels.openai.length > 0 && (
                            availableModels.openai
                              .filter(model => model.id.includes('gpt'))
                              .map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                      {availableModels.openai && availableModels.openai.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {availableModels.openai.length} models available
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => testConnection('OpenAI')}
                      disabled={isTestingConnection.openai}
                    >
                      {isTestingConnection.openai && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isTestingConnection.openai ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Gemini Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Google Gemini</CardTitle>
                    <CardDescription>Configure Google Gemini API access</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isProviderEnabled('gemini')}
                        onCheckedChange={(checked) => updateProvider('gemini', 'enabled', checked)}
                      />
                      <Label>Enable Gemini</Label>
                    </div>
                    <div>
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={getProviderSetting('gemini', 'apiKey')}
                        onChange={(e) => updateProvider('gemini', 'apiKey', e.target.value)}
                        placeholder="API key"
                      />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Select value={getProviderSetting('gemini', 'model')} onValueChange={(value) => updateProvider('gemini', 'model', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.gemini && availableModels.gemini.length > 0 && (
                            availableModels.gemini.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {availableModels.gemini && availableModels.gemini.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {availableModels.gemini.length} models available
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => testConnection('Gemini')}
                      disabled={isTestingConnection.gemini}
                    >
                      {isTestingConnection.gemini && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isTestingConnection.gemini ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Maritaca Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Maritaca</CardTitle>
                    <CardDescription>Configure Maritaca API access</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isProviderEnabled('maritaca')}
                        onCheckedChange={(checked) => updateProvider('maritaca', 'enabled', checked)}
                      />
                      <Label>Enable Maritaca</Label>
                    </div>
                    <div>
                      <Label>Base URL</Label>
                      <Input
                        value={getProviderSetting('maritaca', 'baseUrl')}
                        onChange={(e) => updateProvider('maritaca', 'baseUrl', e.target.value)}
                        placeholder="https://chat.maritaca.ai/api"
                      />
                    </div>
                    <div>
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={getProviderSetting('maritaca', 'apiKey')}
                        onChange={(e) => updateProvider('maritaca', 'apiKey', e.target.value)}
                        placeholder="Your API key"
                      />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Select value={getProviderSetting('maritaca', 'model')} onValueChange={(value) => updateProvider('maritaca', 'model', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.maritaca && availableModels.maritaca.length > 0 && (
                            availableModels.maritaca.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {availableModels.maritaca && availableModels.maritaca.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {availableModels.maritaca.length} models available
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => testConnection('Maritaca')}
                        disabled={isTestingConnection.maritaca}
                      >
                        {isTestingConnection.maritaca && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isTestingConnection.maritaca ? 'Testing...' : 'Test Connection'}
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => fetchModelsOnly('Maritaca')}
                        disabled={isTestingConnection.maritaca || !getProviderSetting('maritaca', 'apiKey')}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Fetch Models
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Custom Provider Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Provider</CardTitle>
                    <CardDescription>Configure any OpenAI-compatible API</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isProviderEnabled('custom')}
                        onCheckedChange={(checked) => updateProvider('custom', 'enabled', checked)}
                      />
                      <Label>Enable Custom Provider</Label>
                    </div>
                    <div>
                      <Label>Base URL</Label>
                      <Input
                        value={getProviderSetting('custom', 'baseUrl')}
                        onChange={(e) => updateProvider('custom', 'baseUrl', e.target.value)}
                        placeholder="https://api.example.com"
                      />
                    </div>
                    <div>
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={getProviderSetting('custom', 'apiKey')}
                        onChange={(e) => updateProvider('custom', 'apiKey', e.target.value)}
                        placeholder="Your API key"
                      />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Select value={getProviderSetting('custom', 'model')} onValueChange={(value) => updateProvider('custom', 'model', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.custom && availableModels.custom.length > 0 && (
                            availableModels.custom.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {availableModels.custom && availableModels.custom.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {availableModels.custom.length} models available
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => testConnection('Custom')}
                      disabled={isTestingConnection.custom}
                    >
                      {isTestingConnection.custom && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isTestingConnection.custom ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Appearance */}
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Theme & Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Theme</Label>
                    <Select value={settings.theme} onValueChange={(value) => setSettings(prev => ({ ...prev, theme: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Default Resume Template</Label>
                    <Select value={settings.resumeDefaults.template} onValueChange={(value) => updateResumeDefault('template', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Modern Professional</SelectItem>
                        <SelectItem value="classic">Classic Traditional</SelectItem>
                        <SelectItem value="creative">Creative Design</SelectItem>
                        <SelectItem value="minimal">Minimal Clean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose which notifications you want to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Follow-up Reminders</Label>
                      <p className="text-sm text-muted-foreground">Get reminded about networking follow-ups</p>
                    </div>
                    <Switch
                      checked={settings.notifications.followUpReminders}
                      onCheckedChange={(checked) => updateNotification('followUpReminders', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Application Deadlines</Label>
                      <p className="text-sm text-muted-foreground">Alerts for job application deadlines</p>
                    </div>
                    <Switch
                      checked={settings.notifications.applicationDeadlines}
                      onCheckedChange={(checked) => updateNotification('applicationDeadlines', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Interview Reminders</Label>
                      <p className="text-sm text-muted-foreground">Reminders for upcoming interviews</p>
                    </div>
                    <Switch
                      checked={settings.notifications.interviewReminders}
                      onCheckedChange={(checked) => updateNotification('interviewReminders', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">Weekly summary of your job search activity</p>
                    </div>
                    <Switch
                      checked={settings.notifications.weeklyReports}
                      onCheckedChange={(checked) => updateNotification('weeklyReports', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy & Security */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Security</CardTitle>
                  <CardDescription>Manage your data privacy and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Data Retention</Label>
                    <Select value={settings.privacy.dataRetention} onValueChange={(value) => updatePrivacy('dataRetention', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6months">6 Months</SelectItem>
                        <SelectItem value="1year">1 Year</SelectItem>
                        <SelectItem value="2years">2 Years</SelectItem>
                        <SelectItem value="indefinite">Indefinite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Backup</Label>
                      <p className="text-sm text-muted-foreground">Automatically backup your data</p>
                    </div>
                    <Switch
                      checked={settings.privacy.autoBackup}
                      onCheckedChange={(checked) => updatePrivacy('autoBackup', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Encryption</Label>
                      <p className="text-sm text-muted-foreground">Encrypt sensitive data at rest</p>
                    </div>
                    <Switch
                      checked={settings.privacy.encryptionEnabled}
                      onCheckedChange={(checked) => updatePrivacy('encryptionEnabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Management */}
            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>Manage your application data and storage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Export Data</h4>
                      <p className="text-sm text-muted-foreground">Download all your data as a backup</p>
                      <Button variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Export All Data
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Clear Data</h4>
                      <p className="text-sm text-muted-foreground">Remove all application data</p>
                      <Button variant="destructive" className="w-full" onClick={clearAllData}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All Data
                      </Button>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Storage Usage</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Profile Data</span>
                        <span>2.3 KB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Job Applications</span>
                        <span>15.7 KB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Network Contacts</span>
                        <span>8.2 KB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Documents</span>
                        <span>124.5 KB</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium border-t pt-2">
                        <span>Total</span>
                        <span>150.7 KB</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

