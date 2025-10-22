import { useState, useEffect } from 'react'
import { Upload, Brain, Loader2, FileText, X, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { AIService } from '@/services/aiService'
import { ProviderSelector } from '@/components/ui/provider-selector'

export function AICVImport({ isOpen, onClose, onImportComplete }) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiProvider, setAiProvider] = useState('')
  const [aiSettings, setAiSettings] = useState({})
  const [availableModels, setAvailableModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [ollamaTimeoutMs, setOllamaTimeoutMs] = useState(90000)
  const [ollamaWarmup, setOllamaWarmup] = useState(true)
  const [ollamaNumPredict, setOllamaNumPredict] = useState(1024)

  // Load AI settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('openJobSettings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      
      // Find first enabled provider
      const enabledProvider = Object.entries(settings.providers || {})
        .find(([_, config]) => config.enabled)
      
      if (enabledProvider) {
        const [providerKey, providerConfig] = enabledProvider
        setAiProvider(providerKey)
        setAiSettings({
          ...providerConfig,
          provider: providerKey
        })
        
        // Load available models for this provider
        loadAvailableModels(providerKey, providerConfig)
      }
    }
  }, [])

  // Load available models when aiProvider changes
  useEffect(() => {
    if (aiProvider && aiSettings.provider) {
      loadAvailableModels(aiProvider, aiSettings)
    }
  }, [aiProvider])

  const loadAvailableModels = async (provider, config) => {
    try {
      setIsLoadingModels(true)
      
      // First try to load from localStorage
      const savedModels = localStorage.getItem('jobm8_available_models')
      if (savedModels) {
        const allModels = JSON.parse(savedModels)
        if (allModels[provider] && allModels[provider].length > 0) {
          const sorted = [...allModels[provider]].sort((a,b)=> (a.name||a.id).localeCompare(b.name||b.id))
          setAvailableModels(sorted)
          
          // Auto-select first model if none selected
          if (!config.model) {
            setAiSettings(prev => ({ ...prev, model: allModels[provider][0].id }))
          }
          return
        }
      }
      
      // If no cached models, test connection
      const result = await AIService.testConnection(provider, config)
      if (result.success) {
        const sorted = (result.models || []).slice().sort((a,b)=> (a.name||a.id).localeCompare(b.name||b.id))
        setAvailableModels(sorted)
        
        // Save models to localStorage
        const allModels = JSON.parse(savedModels || '{}')
        allModels[provider] = sorted
        localStorage.setItem('jobm8_available_models', JSON.stringify(allModels))
        
        // Auto-select first model if none selected
        if (result.models && result.models.length > 0 && !config.model) {
          setAiSettings(prev => ({ ...prev, model: result.models[0].id }))
        }
      } else {
        setAvailableModels([])
        toast({
          title: "Connection Failed",
          description: `Failed to connect to ${provider}: ${result.error}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      setAvailableModels([])
      toast({
        title: "Connection Error",
        description: `Error loading models from ${provider}: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Check file type and extension
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/rtf',
        'text/markdown'
      ]
      
      // Get file extension
      const fileName = file.name.toLowerCase()
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.md']
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
      
      // Check both MIME type and extension (some browsers don't set MIME type for .md files)
      if (!allowedTypes.includes(file.type) && !hasValidExtension) {
        toast({
          title: "Unsupported File Type",
          description: "Please upload a PDF, Word document, text file, or Markdown file.",
          variant: "destructive"
        })
        return
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 10MB.",
          variant: "destructive"
        })
        return
      }

      setSelectedFile(file)
    }
  }

  const extractTextFromFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const text = e.target.result
        
        // Check by file extension if MIME type is not reliable
        const fileName = file.name.toLowerCase()
        const isTextFile = file.type === 'text/plain' || 
                          file.type === 'text/rtf' || 
                          file.type === 'text/markdown' ||
                          fileName.endsWith('.txt') ||
                          fileName.endsWith('.rtf') ||
                          fileName.endsWith('.md')
        
        if (isTextFile) {
          resolve(text)
        } else if (file.type === 'application/pdf') {
          // For PDF, we'll need to extract text (simplified approach)
          // In a real implementation, you'd use a PDF parsing library like pdf-parse
          resolve(text) // Placeholder - actual PDF parsing would be more complex
        } else {
          // For Word documents, similar approach needed
          resolve(text) // Placeholder - actual DOC parsing would require additional libraries
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const processCV = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CV file to import.",
        variant: "destructive"
      })
      return
    }

    if (!aiProvider) {
      toast({
        title: "AI Provider Not Configured",
        description: "Please configure an AI provider in Settings first.",
        variant: "destructive"
      })
      return
    }

    if (!aiSettings.model) {
      toast({
        title: "No AI Model Selected",
        description: "Please select a specific AI model to parse your CV.",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)

    try {
      // Extract text from file
      const cvText = await extractTextFromFile(selectedFile)
      
      // Process with AI
      // If provider is ollama, pass extended options for warmup/timeout
      let effectiveSettings = { ...aiSettings }
      if ((aiProvider || '').toLowerCase() === 'ollama') {
        effectiveSettings = {
          ...effectiveSettings,
          _ollama: {
            timeoutMs: ollamaTimeoutMs,
            warmup: ollamaWarmup,
            numPredict: ollamaNumPredict,
          }
        }
      }

      const result = await AIService.parseCV(cvText, aiProvider, effectiveSettings)
      
      // The AI service now handles data conversion internally
      // Just use the result data directly
      const data = result.data
      console.log('Using AI result data:', data)
      
      if (result.success) {
        // Transform the AI response to match our profile structure
        const profileData = {
          personalInfo: data.personalInfo || {
            name: '',
            email: '',
            phone: '',
            location: '',
            linkedin: '',
            website: '',
            summary: ''
          },
          experiences: data.experiences?.map((exp, index) => ({
            ...exp,
            id: Date.now() + index,
            startDate: normalizeDateFormat(exp.startDate),
            endDate: exp.current ? '' : normalizeDateFormat(exp.endDate),
            bullets: exp.bullets?.filter(bullet => bullet.trim()) || [''],
            skills: exp.skills || []
          })) || [],
          education: data.education?.map((edu, index) => ({
            ...edu,
            id: Date.now() + index + 1000,
            startDate: normalizeDateFormat(edu.startDate),
            endDate: normalizeDateFormat(edu.endDate),
            achievements: edu.achievements || []
          })) || [],
          skills: processSkills(data.skills) || [],
          projects: data.projects || [],
          achievements: data.achievements || []
        }

        // Analyze what fields were successfully filled vs empty
        const importAnalysis = analyzeImportCompleteness(profileData)
        
        onImportComplete(profileData)
        
        // Show detailed import results
        if (result.warning) {
          toast({
            title: "CV Imported with Fallback",
            description: `${result.warning}. ${importAnalysis.filledFields} fields were extracted. Some information may be incomplete - please review and fill in missing details manually.`,
            duration: 10000,
          })
        } else if (importAnalysis.missingFields.length > 0) {
          toast({
            title: "CV Imported with Gaps",
            description: `Successfully imported ${importAnalysis.filledFields} fields. ${importAnalysis.missingFields.length} fields couldn't be detected. Check the imported data and fill missing information manually.`,
            duration: 8000,
          })
        } else {
          toast({
            title: "CV Imported Successfully",
            description: "All available information has been successfully extracted and imported.",
          })
        }
        
        handleClose()
      } else {
        throw new Error(result.error || 'Failed to parse CV')
      }
    } catch (error) {
      console.error('CV import error:', error)
      console.error('AI Provider:', aiProvider)
      console.error('AI Model:', aiSettings.model)
      console.error('File:', selectedFile?.name)
      
      // Provide more helpful error messages for common issues
      let errorMessage = error.message
      if (error.message.includes('Unexpected token') || error.message.includes('Unexpected end of JSON input')) {
        errorMessage = 'The AI service returned malformed data. This usually happens when the AI model doesn\'t follow the expected format. Try using a different AI model or provider.'
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. The AI service may be overloaded. Please try again.'
      } else if (error.message.includes('Invalid JSON')) {
        errorMessage = 'The AI service returned invalid data. This may be due to the model not following instructions properly. Try using a different AI model.'
      } else if (error.message.includes('API key') || error.message.includes('unauthorized') || error.message.includes('401')) {
        errorMessage = 'Invalid API key. Please check your AI provider settings and ensure your API key is correct.'
      } else if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'API quota exceeded or rate limited. Please try again later or check your API usage limits.'
      } else if (error.message.includes('model') && error.message.includes('not found')) {
        errorMessage = 'The selected AI model is not available. Please try a different model or check your AI provider settings.'
      } else if (error.message.includes('max_tokens') && error.message.includes('max_completion_tokens')) {
        errorMessage = 'This AI model requires different parameters. The system has been updated to handle this automatically. Please try again.'
      } else if (error.message.includes('Unsupported parameter')) {
        errorMessage = 'The AI model you selected has different parameter requirements. Please try using a different model or contact support if the issue persists.'
      } else if (error.message.includes('temperature') && error.message.includes('does not support')) {
        errorMessage = 'This AI model has temperature restrictions. The system has been updated to handle this automatically. Please try again.'
      }
      
      toast({
        title: "Import Failed",
        description: `Failed to import CV: ${errorMessage}`,
        variant: "destructive",
        duration: 10000,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              // Try to use fallback parsing
              try {
                const cvText = await extractTextFromFile(selectedFile)
                const fallbackData = AIService.parseCVFallback(cvText)
                onImportComplete(fallbackData)
                toast({
                  title: "CV Imported with Fallback",
                  description: "Used basic text extraction. Please review and fill in missing details manually.",
                  duration: 5000
                })
                handleClose()
              } catch (fallbackError) {
                console.error('Fallback parsing also failed:', fallbackError)
                toast({
                  title: "Fallback Failed",
                  description: "Both AI and fallback parsing failed. Please try a different file or format.",
                  variant: "destructive",
                  duration: 5000
                })
              }
            }}
            className="ml-2"
          >
            Try Fallback
          </Button>
        )
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const processSkills = (skillsData) => {
    if (!skillsData) return []
    
    let allSkills = []
    
    // If it's already an array
    if (Array.isArray(skillsData)) {
      skillsData.forEach(skill => {
        if (typeof skill === 'string' && skill.trim()) {
          // Check if skill contains commas (AI might have grouped them)
          if (skill.includes(',')) {
            const splitSkills = skill.split(',').map(s => s.trim()).filter(s => s)
            allSkills.push(...splitSkills)
          } else {
            allSkills.push(skill.trim())
          }
        }
      })
    } 
    // If it's a string (AI returned skills as single string)
    else if (typeof skillsData === 'string' && skillsData.trim()) {
      const splitSkills = skillsData.split(',').map(s => s.trim()).filter(s => s)
      allSkills.push(...splitSkills)
    }
    
    // Remove duplicates and empty strings
    const uniqueSkills = [...new Set(allSkills)].filter(skill => 
      skill && 
      skill.trim() && 
      skill.trim().length > 0
    )
    
    return uniqueSkills
  }

  const normalizeDateFormat = (dateStr) => {
    if (!dateStr || dateStr.trim() === '') return ''
    
    // Already in YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr
    
    // Just year (YYYY) -> keep as YYYY
    if (/^\d{4}$/.test(dateStr)) return dateStr
    
    // Handle various formats like "Jan 2023", "January 2023", "2023 Jan", etc.
    const monthNames = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02', 
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05', 'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    }
    
    const normalized = dateStr.toLowerCase().trim()
    
    // Try to extract year and month
    const yearMatch = normalized.match(/\b(\d{4})\b/)
    if (yearMatch) {
      const year = yearMatch[1]
      
      // Look for month name
      for (const [monthName, monthNum] of Object.entries(monthNames)) {
        if (normalized.includes(monthName)) {
          return `${year}-${monthNum}`
        }
      }
      
      // Look for numeric month
      const monthMatch = normalized.match(/\b(\d{1,2})\b/)
      if (monthMatch && monthMatch[1] !== year) {
        const month = monthMatch[1].padStart(2, '0')
        if (month >= '01' && month <= '12') {
          return `${year}-${month}`
        }
      }
      
      // If only year found, return just the year
      return year
    }
    
    return dateStr // Return as-is if we can't parse it
  }

  const analyzeImportCompleteness = (profileData) => {
    const missingFields = []
    let filledFieldsCount = 0
    
    // Check Personal Info
    const personalFields = ['name', 'email', 'phone', 'location', 'linkedin', 'website', 'summary']
    personalFields.forEach(field => {
      if (!profileData.personalInfo[field] || profileData.personalInfo[field].trim() === '') {
        missingFields.push(`Personal Info: ${field.charAt(0).toUpperCase() + field.slice(1)}`)
      } else {
        filledFieldsCount++
      }
    })
    
    // Check Experience
    if (profileData.experiences.length === 0) {
      missingFields.push('Work Experience: No experience entries found')
    } else {
      profileData.experiences.forEach((exp, index) => {
        if (!exp.role || exp.role.trim() === '') {
          missingFields.push(`Experience ${index + 1}: Job Title`)
        } else {
          filledFieldsCount++
        }
        if (!exp.company || exp.company.trim() === '') {
          missingFields.push(`Experience ${index + 1}: Company`)
        } else {
          filledFieldsCount++
        }
        if (!exp.startDate || exp.startDate.trim() === '') {
          missingFields.push(`Experience ${index + 1}: Start Date`)
        } else {
          filledFieldsCount++
        }
        if (exp.bullets.length === 0 || exp.bullets.every(bullet => !bullet.trim())) {
          missingFields.push(`Experience ${index + 1}: Job responsibilities/achievements`)
        } else {
          filledFieldsCount++
        }
      })
    }
    
    // Check Education
    if (profileData.education.length === 0) {
      missingFields.push('Education: No education entries found')
    } else {
      profileData.education.forEach((edu, index) => {
        if (!edu.school || edu.school.trim() === '') {
          missingFields.push(`Education ${index + 1}: School/University`)
        } else {
          filledFieldsCount++
        }
        if (!edu.degree || edu.degree.trim() === '') {
          missingFields.push(`Education ${index + 1}: Degree`)
        } else {
          filledFieldsCount++
        }
      })
    }
    
    // Check Skills
    if (profileData.skills.length === 0) {
      missingFields.push('Skills: No skills detected')
    } else {
      filledFieldsCount++
    }
    
    return {
      missingFields,
      filledFields: filledFieldsCount
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setIsProcessing(false)
    onClose()
  }

  const testAIConnection = async () => {
    try {
      if (!aiProvider) {
        throw new Error('No AI provider selected')
      }
      
      if (!aiSettings.model) {
        throw new Error('No AI model selected')
      }
      
      toast({ 
        title: 'Testing AI Connection...', 
        description: 'Please wait while we test your AI configuration.',
        duration: 3000
      })
      
      const testResult = await AIService.testConnection(aiProvider, aiSettings)
      
      if (testResult.success) {
        toast({ 
          title: 'AI Connection Successful', 
          description: `Successfully connected to ${aiProvider} with model ${aiSettings.model}.`,
          duration: 5000
        })
      } else {
        throw new Error(testResult.error || 'Connection test failed')
      }
    } catch (error) {
      console.error('AI connection test failed:', error)
      toast({ 
        title: 'AI Connection Failed', 
        description: error.message, 
        variant: 'destructive',
        duration: 8000
      })
    }
  }

  const handleProviderChange = (provider) => {
    setAiProvider(provider)
    
    // Load the selected provider's settings
    const savedSettings = localStorage.getItem('openJobSettings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      const providerConfig = settings.providers[provider]
      
      if (providerConfig) {
        setAiSettings({
          ...providerConfig,
          provider: provider
        })
        
        // Load available models for the new provider
        loadAvailableModels(provider, providerConfig)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Powered CV Import
          </DialogTitle>
          <DialogDescription>
            Upload your CV and let AI automatically extract and organize your information. 
            If AI parsing fails, a basic text extraction fallback will be used.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload CV File</Label>
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, TXT, RTF, or MD (Max 10MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.rtf,.md"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              )}
            </div>
          </div>

          {/* AI Provider Selection */}
          <ProviderSelector
            selectedProvider={aiProvider}
            onProviderChange={handleProviderChange}
            title="AI Provider"
            description="Choose which AI provider to use for CV parsing"
            showCard={false}
          />

          {/* Model Selection */}
          {aiProvider && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="model-select">AI Model</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAvailableModels(aiProvider, aiSettings)}
                  disabled={isLoadingModels}
                  className="h-6 px-2"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              <Select 
                value={aiSettings.model || ''} 
                onValueChange={(value) => {
                  setAiSettings(prev => ({ ...prev, model: value }))
                  
                  // Save the selected model to localStorage
                  const savedSettings = localStorage.getItem('openJobSettings')
                  if (savedSettings) {
                    const settings = JSON.parse(savedSettings)
                    if (settings.providers && settings.providers[aiProvider]) {
                      settings.providers[aiProvider].model = value
                      localStorage.setItem('openJobSettings', JSON.stringify(settings))
                    }
                  }
                }}
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select Model"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="flex items-center gap-2">
                        <span>{model.name || model.id}</span>
                        {model.size && <span className="text-xs text-muted-foreground">({model.size})</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {isLoadingModels && (
                <p className="text-xs text-muted-foreground">Loading available models...</p>
              )}
              
              {!isLoadingModels && availableModels.length === 0 && (
                <p className="text-xs text-muted-foreground">No models available. Check your provider configuration.</p>
              )}
              
              {availableModels.length > 0 && !aiSettings.model && (
                <p className="text-xs text-amber-600">Please select a model to continue.</p>
              )}
              
              {availableModels.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {availableModels.length} model{availableModels.length !== 1 ? 's' : ''} available
                </p>
              )}
              
              {/* Test Connection Button */}
              {aiProvider && aiSettings.model && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testAIConnection}
                    className="w-full h-8 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Test Connection
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Ollama advanced options */}
          {aiProvider?.toLowerCase() === 'ollama' && (
            <div className="space-y-3 border rounded-md p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Ollama advanced options</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={ollamaTimeoutMs}
                    onChange={(e) => setOllamaTimeoutMs(parseInt(e.target.value || '0', 10) || 0)}
                    placeholder="90000"
                  />
                </div>
                <div>
                  <Label className="text-xs">num_predict</Label>
                  <Input
                    type="number"
                    value={ollamaNumPredict}
                    onChange={(e) => setOllamaNumPredict(parseInt(e.target.value || '0', 10) || 0)}
                    placeholder="1024"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={ollamaWarmup} onChange={(e)=>setOllamaWarmup(e.target.checked)} />
                    <span className="text-xs">Warmup before request</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={processCV} 
              disabled={!selectedFile || !aiProvider || !aiSettings.model || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Import with AI
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}