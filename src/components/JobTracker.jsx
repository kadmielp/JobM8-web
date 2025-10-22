import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Calendar, ExternalLink, Filter, Download, Search, Sparkles, Loader2, X, Upload, Columns, MoreVertical, CheckSquare, Building, MapPin, DollarSign, FileText, TrendingUp, FileEdit, MessageCircle, Users, StickyNote, Contact, Folder, RefreshCw, Briefcase, ArrowLeftRight, Globe, SquarePen, Info, FilePlus2, Delete, Gauge, ChevronDown, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { AIService } from '@/services/aiService'
import { ProviderSelector } from '@/components/ui/provider-selector'
import { 
  extractFromJobDescription, 
  extractFromResume, 
  compareSkills, 
  upsertLocalSkill 
} from '@/services/skillExtractor'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'

const defaultStatuses = [
  { id: 'saved', label: 'Saved', color: 'bg-gray-500' },
  { id: 'applied', label: 'Applied', color: 'bg-blue-500' },
  { id: 'interview', label: 'Interview', color: 'bg-yellow-500' },
  { id: 'offer', label: 'Offer', color: 'bg-green-500' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500' }
]

// Utility function to convert basic Markdown to HTML
const markdownToHtml = (text) => {
  if (!text) return ''
  
  return text
    // Convert **bold** to <strong> tags
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em> tags
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert - bullet points to proper list items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive list items in <ul> tags
    .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc pl-6 space-y-1">$1</ul>')
    // Convert line breaks to <br> tags
    .replace(/\n/g, '<br>')
    // Clean up multiple consecutive <br> tags
    .replace(/(<br>){3,}/g, '<br><br>')
    // Clean up empty list items
    .replace(/<li><\/li>/g, '')
    // Clean up empty ul tags
    .replace(/<ul class="list-disc pl-6 space-y-1"><\/ul>/g, '')
    // Handle multiple consecutive dashes for better list formatting
    .replace(/^-{2,} (.+)$/gm, '<li>$1</li>')
    // Handle different bullet point styles
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/^· (.+)$/gm, '<li>$1</li>')
}

// Normalize tailored resume content to proper Markdown for download
const normalizeToMarkdown = (text) => {
  if (!text) return ''
  let md = String(text)
    .replace(/\r\n/g, '\n')
    // Convert bullet dots to Markdown list items
    .replace(/^\s*•\s/gm, '- ')
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n')

  // Promote explanation heading to Markdown H2
  md = md.replace(/(^|\n)EXPLANATION OF CHANGES\s*\n/gi, '\n\n## Explanation of Changes\n')

  return md.trim() + '\n'
}

export function JobTracker() {
  const { toast } = useToast()
  const fileInputRef = useRef(null)
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingJob, setEditingJob] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [newBenefit, setNewBenefit] = useState('')
  const [editBenefit, setEditBenefit] = useState('')
  const [draggingJobId, setDraggingJobId] = useState(null)
  const [dragOverStatus, setDragOverStatus] = useState(null)
  const [viewJob, setViewJob] = useState(null)
  const [statuses, setStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem('openJobStatuses')
      return saved ? JSON.parse(saved) : defaultStatuses
    } catch {
      return defaultStatuses
    }
  })
  const [activeView, setActiveView] = useState('overview')
  const [noteDraft, setNoteDraft] = useState('')
  const [taskDraft, setTaskDraft] = useState('')
  const [taskDueDraft, setTaskDueDraft] = useState('')

  // Skill gap analysis state
  const [resumeProfile, setResumeProfile] = useState(null)
  const [isExtractingSkills, setIsExtractingSkills] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [skillAnalysis, setSkillAnalysis] = useState(null)

  // New: explicit extracted skill sets for gating the comparison
  const [extractedResumeSkills, setExtractedResumeSkills] = useState([])
  const [extractedJobSkills, setExtractedJobSkills] = useState([])
  const [isExtractingResumeSkills, setIsExtractingResumeSkills] = useState(false)
  
  // AI provider/model selection for skill extraction
  const [skillExtractionProvider, setSkillExtractionProvider] = useState('openai')
  const [skillExtractionModel, setSkillExtractionModel] = useState('')
  const [skillExtractionModels, setSkillExtractionModels] = useState([])
  
  // Resume tailoring state - Step-by-step approach
  const [isGeneratingResume, setIsGeneratingResume] = useState(false)
  const [tailoredResume, setTailoredResume] = useState(null)
  const [tailoringProgress, setTailoringProgress] = useState(0)

  // Step-by-step tailoring state
  const [currentTailoringStep, setCurrentTailoringStep] = useState(0)
  const [tailoringSteps, setTailoringSteps] = useState([
    { id: 'summary', name: 'Professional Summary', completed: false, data: null },
    { id: 'experience', name: 'Relevant Experience', completed: false, data: null },
    { id: 'education', name: 'Education', completed: false, data: null },
    { id: 'skills', name: 'Skills', completed: false, data: null }
  ])
  const [tailoringInProgress, setTailoringInProgress] = useState(false)
  
  // AI provider and model selection
  const [aiProvider, setAiProvider] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [availableModels, setAvailableModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [providerStatus, setProviderStatus] = useState({})
  const [showAIConfig, setShowAIConfig] = useState(false)
  
  // Load available providers and test connections
  useEffect(() => {
    loadAvailableProviders()
  }, [])
  
  const loadAvailableProviders = async () => {
    setIsLoadingModels(true)
    try {
      const savedSettings = localStorage.getItem('openJobSettings')
      if (!savedSettings) {
        setProviderStatus({})
        setIsLoadingModels(false)
        return
      }
      
      const settings = JSON.parse(savedSettings)
      const providers = ['openai', 'gemini', 'ollama', 'custom']
      const status = {}
      
      for (const provider of providers) {
        try {
          const providerConfig = settings.providers?.[provider]
          if (providerConfig && providerConfig.enabled) {
            // Check if provider has required configuration
            let hasConfig = false
            switch (provider) {
              case 'ollama':
                hasConfig = providerConfig.host && providerConfig.host.trim() !== ''
                break
              case 'openai':
              case 'gemini':
              case 'custom':
                hasConfig = providerConfig.apiKey && providerConfig.apiKey.trim() !== ''
                break
              default:
                hasConfig = false
            }
            
            if (hasConfig) {
              const testResult = await AIService.testConnection(provider, providerConfig)
              status[provider] = testResult.success
              if (testResult.success && testResult.models) {
                setAvailableModels(prev => ({ ...prev, [provider]: testResult.models }))
              }
            } else {
              status[provider] = false
            }
          } else {
            status[provider] = false
          }
        } catch (error) {
          status[provider] = false
          console.error(`Error testing ${provider}:`, error)
        }
      }
      
      setProviderStatus(status)
    } catch (error) {
      console.error('Error loading providers:', error)
      setProviderStatus({})
    } finally {
      setIsLoadingModels(false)
    }
  }
  
  // Set default model when provider changes
  useEffect(() => {
    if (aiProvider && availableModels[aiProvider] && availableModels[aiProvider].length > 0) {
      setAiModel(availableModels[aiProvider][0].id || availableModels[aiProvider][0].name)
    } else {
      setAiModel('')
    }
  }, [aiProvider, availableModels])

  const loadAvailableModels = async (provider, config) => {
    try {
      setIsLoadingModels(true)
      
      // First try to load from localStorage
      const savedModels = localStorage.getItem('jobm8_available_models')
      if (savedModels) {
        const allModels = JSON.parse(savedModels)
        if (allModels[provider] && allModels[provider].length > 0) {
          setAvailableModels(prev => ({ ...prev, [provider]: allModels[provider] }))
          
          // Auto-select first model if none selected
          if (!aiModel) {
            setAiModel(allModels[provider][0].id)
          }
          return
        }
      }
      
      // If no cached models, test connection
      const result = await AIService.testConnection(provider, config)
      if (result.success) {
        setAvailableModels(prev => ({ ...prev, [provider]: result.models || [] }))
        
        // Save models to localStorage
        const allModels = JSON.parse(savedModels || '{}')
        allModels[provider] = result.models || []
        localStorage.setItem('jobm8_available_models', JSON.stringify(allModels))
        
        // Auto-select first model if none selected
        if (result.models && result.models.length > 0 && !aiModel) {
          setAiModel(result.models[0].id)
        }
      } else {
        setAvailableModels(prev => ({ ...prev, [provider]: [] }))
        toast({
          title: "Connection Failed",
          description: `Failed to connect to ${provider}: ${result.error}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      setAvailableModels(prev => ({ ...prev, [provider]: [] }))
      toast({
        title: "Connection Error",
        description: `Error loading models from ${provider}: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setIsLoadingModels(false)
    }
  }
  
  // Auto-select first available provider when providers are loaded
  useEffect(() => {
    if (!aiProvider && Object.keys(providerStatus).length > 0) {
      const availableProvider = Object.entries(providerStatus).find(([_, isAvailable]) => isAvailable)?.[0]
      if (availableProvider) {
        setAiProvider(availableProvider)
      }
    }
  }, [providerStatus, aiProvider])

  const handleProviderChange = (provider) => {
    setAiProvider(provider)
    
    // Load the selected provider's settings
    const savedSettings = localStorage.getItem('openJobSettings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      const providerConfig = settings.providers[provider]
      
      if (providerConfig) {
        // Load available models for the new provider
        loadAvailableModels(provider, providerConfig)
      }
    }
  }
  
  // Visual feedback state for skills
  const [recentlyAddedSkills, setRecentlyAddedSkills] = useState(new Set())
  const [recentlyIgnoredSkills, setRecentlyIgnoredSkills] = useState(new Set())

  const [newJob, setNewJob] = useState({
    company: '',
    role: '',
    location: '',
    source: '',
    status: 'saved',
    deadline: '',
    nextAction: '',
    jobDescription: '',
    notes: '',
    salary: '',
    jobUrl: '',
    appliedDate: '',
    benefits: []
  })

  useEffect(() => {
    // Load jobs from localStorage
    const savedJobs = localStorage.getItem('openJobJobs')
    if (savedJobs) {
      const parsedJobs = JSON.parse(savedJobs)
      setJobs(parsedJobs)
      setFilteredJobs(parsedJobs)
    } else {
      // Start with empty job list - user will add their own jobs
      setJobs([])
      setFilteredJobs([])
    }
  }, [])

  // Load resume/profile for skill analysis
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('openJobProfile')
      if (savedProfile) {
        const profile = JSON.parse(savedProfile)
        setResumeProfile(profile)
        
        // Use profile skills as the base for extracted resume skills
        if (profile.skills && profile.skills.length > 0) {
          setExtractedResumeSkills(profile.skills)
        }
      }
    } catch {}
  }, [])

  // Listen for changes to the resume profile in localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'openJobProfile') {
        try {
          if (e.newValue) {
            const profile = JSON.parse(e.newValue)
            setResumeProfile(profile)
            
            // If we have a job open and skills have changed, refresh the skill analysis
            if (viewJob && profile.skills && skillAnalysis) {
              const currentSkills = new Set(extractedResumeSkills.map(s => s.toLowerCase()))
              const newSkills = new Set(profile.skills.map(s => s.toLowerCase()))
              
              // Check if skills have actually changed
              if (currentSkills.size !== newSkills.size || 
                  !Array.from(currentSkills).every(skill => newSkills.has(skill))) {
                // Skills have changed, refresh the analysis
                setTimeout(() => refreshSkillsFromProfile(), 100)
              }
            }
          }
        } catch (error) {
          console.error('Error parsing updated resume profile:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events (for same-tab updates)
    const handleCustomStorageChange = (e) => {
      if (e.detail?.key === 'openJobProfile') {
        handleStorageChange({ key: 'openJobProfile', newValue: e.detail.value })
      }
    }
    
    window.addEventListener('customStorageChange', handleCustomStorageChange)
    
    // Create a custom event dispatcher for same-tab updates
    const originalSetItem = localStorage.setItem
    localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value)
      if (key === 'openJobProfile') {
        window.dispatchEvent(new CustomEvent('customStorageChange', {
          detail: { key, value }
        }))
      }
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('customStorageChange', handleCustomStorageChange)
      // Restore original localStorage.setItem
      localStorage.setItem = originalSetItem
    }
  }, [viewJob, skillAnalysis, extractedResumeSkills])

  useEffect(() => {
    localStorage.setItem('openJobStatuses', JSON.stringify(statuses))
  }, [statuses])

  useEffect(() => {
    // Filter jobs based on search and status
    let filtered = jobs
    
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => job.status === filterStatus)
    }
    
    setFilteredJobs(filtered)
  }, [jobs, searchTerm, filterStatus])

  const saveJobs = (updatedJobs) => {
    localStorage.setItem('openJobJobs', JSON.stringify(updatedJobs))
    setJobs(updatedJobs)
  }

  // Save skill analysis data for a specific job
  const saveSkillAnalysis = (jobId, analysis) => {
    if (!analysis) return
    
    try {
      const key = `openJobSkillAnalysis_${jobId}`
      localStorage.setItem(key, JSON.stringify(analysis))
    } catch (error) {
      console.error('Error saving skill analysis:', error)
    }
  }

  // Load skill analysis data for a specific job
  const loadSkillAnalysis = (jobId) => {
    if (!jobId) return null
    
    try {
      const key = `openJobSkillAnalysis_${jobId}`
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error('Error loading skill analysis:', error)
      return null
    }
  }

  // Clear all skill analysis data (useful for cleanup)
  const clearAllSkillAnalysis = () => {
    try {
      const keys = Object.keys(localStorage)
      const skillAnalysisKeys = keys.filter(key => key.startsWith('openJobSkillAnalysis_'))
      skillAnalysisKeys.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.error('Error clearing skill analysis data:', error)
    }
  }

  useEffect(() => {
    if (editingJob) {
      setEditJob({
        ...editingJob,
        benefits: editingJob.benefits || [],
        jobDescription:
          typeof editingJob.jobDescription === 'string' && editingJob.jobDescription.length > 0
            ? editingJob.jobDescription
            : (typeof editingJob.notes === 'string' ? editingJob.notes : ''),
      })
    } else {
      setEditJob(null)
    }
  }, [editingJob])

  const addJob = () => {
    const job = {
      ...newJob,
      id: Date.now(),
      history: [{ type: 'created', at: new Date().toISOString(), payload: {} }],
      // Persist description separately from notes list
      jobDescription: newJob.jobDescription || (typeof newJob.notes === 'string' ? newJob.notes : ''),
      notes: [],
      tasks: [],
      appliedDate: newJob.status === 'applied' ? new Date().toISOString().split('T')[0] : newJob.appliedDate
    }
    const updatedJobs = [...jobs, job]
    saveJobs(updatedJobs)
    setNewJob({
      company: '',
      role: '',
      location: '',
      source: '',
      status: 'saved',
      deadline: '',
      nextAction: '',
      jobDescription: '',
      notes: '',
      salary: '',
      jobUrl: '',
      appliedDate: '',
      benefits: []
    })
    setIsDialogOpen(false)
    toast({
      title: "Job Added",
      description: "New job has been added to your tracker.",
    })
  }

  const updateJobStatus = (jobId, newStatus) => {
    const updatedJobs = jobs.map(job => {
      if (job.id === jobId) {
        const updatedJob = { ...job, status: newStatus, history: [ ...(job.history || []), { type: 'status', from: job.status, to: newStatus, at: new Date().toISOString() } ] }
        if (newStatus === 'applied' && !job.appliedDate) {
          updatedJob.appliedDate = new Date().toISOString().split('T')[0]
        }
        return updatedJob
      }
      return job
    })
    saveJobs(updatedJobs)
    toast({
      title: "Status Updated",
      description: `Job status changed to ${statuses.find(s => s.id === newStatus)?.label}`,
    })
    if (viewJob && viewJob.id === jobId) {
      const refreshed = updatedJobs.find(j => j.id === jobId)
      setViewJob(refreshed)
    }
  }

  const deleteJob = (jobId) => {
    const updatedJobs = jobs.filter(job => job.id !== jobId)
    saveJobs(updatedJobs)
    
    // Clean up skill analysis data for deleted job
    try {
      const key = `openJobSkillAnalysis_${jobId}`
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error cleaning up skill analysis:', error)
    }
    
    toast({
      title: "Job Deleted",
      description: "Job has been removed from your tracker.",
    })
  }

  const saveEditedJob = () => {
    if (!editJob) return
    const updatedJobs = jobs.map(job => {
      if (job.id === editJob.id) {
        const updated = { ...job, ...editJob }
        if (updated.status === 'applied' && !updated.appliedDate) {
          updated.appliedDate = new Date().toISOString().split('T')[0]
        }
        return updated
      }
      return job
    })
    saveJobs(updatedJobs)
    setEditingJob(null)
    toast({
      title: 'Job Updated',
      description: 'Your changes have been saved.',
    })
  }

  const exportToCSV = () => {
    const headers = ['Company', 'Role', 'Location', 'Status', 'Source', 'Applied Date', 'Deadline', 'Next Action', 'Benefits', 'Salary', 'Job Description']
    const csvContent = [
      headers.join(','),
      ...jobs.map(job => [
        job.company,
        job.role,
        job.location,
        job.status,
        job.source,
        job.appliedDate,
        job.deadline,
        job.nextAction,
        (Array.isArray(job.benefits) ? job.benefits.join(' | ') : ''),
        job.salary,
        ((job.jobDescription || job.notes || '')).replace(/,/g, ';')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'job-applications.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      let imported = []
      if (file.name.toLowerCase().endsWith('.json')) {
        const data = JSON.parse(text)
        if (Array.isArray(data)) imported = data
      } else {
        const lines = text.split(/\r?\n/).filter(Boolean)
        if (lines.length === 0) throw new Error('Empty file')
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',')
          const row = Object.fromEntries(headers.map((h, idx) => [h, cols[idx] ? cols[idx].trim() : '']))
          imported.push({
            id: Date.now() + i,
            company: row['company'] || '',
            role: row['role'] || '',
            location: row['location'] || '',
            source: row['source'] || '',
            status: statuses.find(s => s.id === (row['status'] || '').toLowerCase())?.id || 'saved',
            appliedDate: row['applied date'] || '',
            deadline: row['deadline'] || '',
            nextAction: row['next action'] || '',
            salary: row['salary'] || '',
            jobUrl: row['job url'] || '',
            notes: row['job description'] || '',
            benefits: row['benefits'] ? row['benefits'].split('|').map(b => b.trim()).filter(Boolean) : []
          })
        }
      }
      if (imported.length > 0) {
        const merged = [...jobs, ...imported]
        saveJobs(merged)
        toast({ title: 'Imported', description: `Added ${imported.length} jobs from file.` })
      } else {
        toast({ title: 'Nothing to import', description: 'No valid rows found.', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Import failed', description: e.message || 'Could not parse file.', variant: 'destructive' })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddColumn = () => {
    const label = window.prompt('New column name')
    if (!label || !label.trim()) return
    const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    if (statuses.some(s => s.id === slug)) {
      toast({ title: 'Column exists', description: 'Choose a different name.', variant: 'destructive' })
      return
    }
    const palette = ['bg-purple-500','bg-pink-500','bg-teal-500','bg-indigo-500','bg-orange-500']
    const color = palette[statuses.length % palette.length]
    setStatuses(prev => [...prev, { id: slug, label, color }])
  }

  const handleRemoveColumn = (statusId) => {
    if (defaultStatuses.some(s => s.id === statusId)) {
      toast({ title: 'Cannot remove default column', variant: 'destructive' })
      return
    }
    const hasJobs = jobs.some(j => j.status === statusId)
    const confirmMsg = hasJobs ? 'Remove this column? Jobs in this column will be moved to Saved.' : 'Remove this column?'
    if (!window.confirm(confirmMsg)) return
    setStatuses(prev => prev.filter(s => s.id !== statusId))
    if (hasJobs) {
      const updated = jobs.map(j => j.status === statusId ? { ...j, status: 'saved' } : j)
      saveJobs(updated)
    }
    setFilterStatus(f => (f === statusId ? 'all' : f))
    toast({ title: 'Column removed' })
  }

  const persistJobMutation = (jobId, mutator) => {
    const updated = jobs.map(j => (j.id === jobId ? mutator({ ...j }) : j))
    saveJobs(updated)
    const fresh = updated.find(j => j.id === jobId)
    setViewJob(fresh)
  }

  const addNote = () => {
    const text = noteDraft.trim()
    if (!viewJob || !text) return
    persistJobMutation(viewJob.id, j => {
      const existingNotes = Array.isArray(j.notes) ? j.notes : []
      j.notes = [...existingNotes, { id: Date.now(), text, at: new Date().toISOString() }]
      j.history = [...(j.history || []), { type: 'note', at: new Date().toISOString() }]
      return j
    })
    setNoteDraft('')
  }

  const addTask = () => {
    const title = taskDraft.trim()
    if (!viewJob || !title) return
    persistJobMutation(viewJob.id, j => {
      j.tasks = [...(j.tasks || []), { id: Date.now(), title, due: taskDueDraft || '', done: false, createdAt: new Date().toISOString() }]
      j.history = [...(j.history || []), { type: 'task', at: new Date().toISOString(), payload: { title } }]
      return j
    })
    setTaskDraft(''); setTaskDueDraft('')
  }

  const toggleTask = (taskId) => {
    if (!viewJob) return
    persistJobMutation(viewJob.id, j => {
      j.tasks = (j.tasks || []).map(t => t.id === taskId ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : undefined } : t)
      return j
    })
  }

  const deleteTask = (taskId) => {
    if (!viewJob) return
    persistJobMutation(viewJob.id, j => {
      j.tasks = (j.tasks || []).filter(t => t.id !== taskId)
      return j
    })
  }

  // Drag & Drop handlers
  const handleDragStart = (e, jobId) => {
    try { e.dataTransfer.setData('text/plain', String(jobId)) } catch {}
    e.dataTransfer.effectAllowed = 'move'
    setDraggingJobId(jobId)
  }

  const handleDragEnd = () => {
    setDraggingJobId(null)
    setDragOverStatus(null)
  }

  const handleDragOver = (e, statusId) => {
    e.preventDefault()
    try { e.dataTransfer.dropEffect = 'move' } catch {}
    setDragOverStatus(statusId)
  }

  const handleDrop = (e, statusId) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')
    const jobId = parseInt(data, 10)
    if (!Number.isNaN(jobId)) {
      updateJobStatus(jobId, statusId)
    }
    setDragOverStatus(null)
    setDraggingJobId(null)
  }

  const getProviderConfig = (provider) => {
    try {
      const savedSettings = localStorage.getItem('openJobSettings')
      if (!savedSettings) return null
      const settings = JSON.parse(savedSettings)
      
      if (provider) {
        // Return specific provider config
        const providerConfig = settings.providers?.[provider]
        if (providerConfig && providerConfig.enabled) {
          return { provider, ...providerConfig }
        }
        return null
      } else {
        // Return default provider config
        const providerKey = (settings.defaultProvider || 'openai').toLowerCase()
        const providerConfig = settings.providers?.[providerKey]
        if (providerConfig && providerConfig.enabled) {
          return { provider: providerKey, ...providerConfig }
        }
        return null
      }
    } catch {
      return null
    }
  }

  const fetchPageText = async (url) => {
    // Use Jina Reader to bypass CORS and get clean text
    const withoutProtocol = url.replace(/^https?:\/\//i, '')
    const readerUrl = `https://r.jina.ai/http://${withoutProtocol}`
    const res = await fetch(readerUrl)
    if (!res.ok) throw new Error(`Failed to fetch URL (HTTP ${res.status})`)
    return await res.text()
  }

  // Fallback function to extract job description when AI parsing fails or is incomplete
  const extractJobDescriptionFallback = (pageText) => {
    console.log('Using fallback job description extraction...')
    
    // Look for common job description patterns
    const lines = pageText.split('\n').map(line => line.trim()).filter(line => line)
    
    let description = ''
    let inDescription = false
    
    // Common keywords that indicate job description sections
    const descriptionKeywords = [
      'job description', 'description', 'about the role', 'role overview',
      'responsibilities', 'requirements', 'qualifications', 'what you\'ll do',
      'key responsibilities', 'essential functions', 'duties', 'tasks'
    ]
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      
      // Check if we're entering a description section
      if (descriptionKeywords.some(keyword => line.includes(keyword))) {
        inDescription = true
        description += lines[i] + '\n'
        continue
      }
      
      // If we're in a description section, collect content
      if (inDescription) {
        // Stop if we hit another major section
        const stopKeywords = ['benefits', 'compensation', 'salary', 'location', 'contact', 'apply', 'application']
        if (stopKeywords.some(keyword => line.includes(keyword))) {
          break
        }
        
        description += lines[i] + '\n'
      }
    }
    
    // If no structured description found, try to extract meaningful content
    if (!description.trim()) {
      // Look for paragraphs with substantial content (likely job details)
      const paragraphs = pageText.split('\n\n').filter(p => p.trim().length > 50)
      if (paragraphs.length > 0) {
        // Take the middle paragraphs (usually contain the main content)
        const startIndex = Math.floor(paragraphs.length * 0.2)
        const endIndex = Math.floor(paragraphs.length * 0.8)
        description = paragraphs.slice(startIndex, endIndex).join('\n\n')
      }
    }
    
    // Clean up the description
    description = description
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .trim()
    
    return description || 'Job description could not be fully extracted. Please review the original posting and add details manually.'
  }

  // (Rolled back) Any benefits auto-extraction/categorization is disabled. Users can add benefits manually.

  const validateAIConfiguration = () => {
    const savedSettings = localStorage.getItem('openJobSettings')
    if (!savedSettings) {
      throw new Error('No AI configuration found. Please configure an AI provider in Settings first.')
    }
    
    const settings = JSON.parse(savedSettings)
    const providerConfig = settings.providers[aiProvider]
    
    if (!providerConfig || !providerConfig.enabled) {
      throw new Error(`AI provider "${aiProvider}" is not configured or enabled. Please check your Settings.`)
    }
    
    if (!providerConfig.apiKey && aiProvider !== 'ollama') {
      throw new Error(`API key is missing for ${aiProvider}. Please check your Settings.`)
    }
    
    if (!aiModel) {
      throw new Error('No AI model selected. Please select a model from the dropdown.')
    }
    
    return { settings, providerConfig }
  }

  const testAIConnection = async () => {
    try {
      validateAIConfiguration()
      
      const { settings, providerConfig } = validateAIConfiguration()
      
      toast({ 
        title: 'Testing AI Connection...', 
        description: 'Please wait while we test your AI configuration.',
        duration: 3000
      })
      
      const testResult = await AIService.testConnection(aiProvider, {
        ...providerConfig,
        model: aiModel
      })
      
      if (testResult.success) {
        toast({ 
          title: 'AI Connection Successful', 
          description: `Successfully connected to ${aiProvider} with model ${aiModel}.`,
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

  const handleAutoFillFromUrl = async () => {
    if (!newJob.jobUrl || newJob.jobUrl.trim().length < 8) {
      toast({ title: 'Enter a valid Job URL', description: 'Add a job posting link first.', variant: 'destructive' })
      return
    }
    
    // Validate AI configuration before proceeding
    try {
      validateAIConfiguration()
    } catch (configError) {
      toast({ 
        title: 'AI Configuration Error', 
        description: configError.message, 
        variant: 'destructive',
        duration: 8000
      })
      return
    }
    
    setIsAutoFilling(true)
    try {
      const pageText = await fetchPageText(newJob.jobUrl.trim())

      // Split the prompt to handle long job descriptions better
      const basePrompt = `Extract job posting details from the following text and return JSON with the keys below. Keep values concise EXCEPT for jobDescription which MUST be the exact job description text from the posting. Preserve line breaks and bullet points using '-' where appropriate. If multiple sections like Responsibilities/Requirements exist, concatenate them in order. If not found, set to empty string.

Required keys:
{
  "company": string,
  "role": string,
  "location": string,
  "source": string,
  "status": one of ["saved", "applied", "interview", "offer", "rejected"],
  "deadline": string (YYYY-MM-DD or empty),
  "nextAction": string,
  "salary": string,
  "jobUrl": string,
  "appliedDate": string,
  "jobDescription": string
}

Guidance:
- If source is not explicitly stated, set it to the domain of the job URL.
- Use neutral, concise phrasing.
- IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text or explanations.
- For jobDescription, include the COMPLETE text even if it's very long.

Job URL: ${newJob.jobUrl}

TEXT:`

      // Check if the page text is very long and might exceed token limits
      const isLongText = pageText.length > 8000 // Rough estimate for token limits
      
      let prompt
      if (isLongText) {
        // For long texts, use a more focused approach
        prompt = `${basePrompt}
${pageText.substring(0, 8000)}...

IMPORTANT: The job description text was truncated due to length. Please extract what you can from the available text and note that the full description may be incomplete.

Return only the JSON object above, nothing else.`
      } else {
        prompt = `${basePrompt}
${pageText}

Return only the JSON object above, nothing else.`
      }

      // Use selected provider and model, or fall back to default provider
      let aiResult
      if (aiProvider && aiModel) {
        // Use the selected provider and model
        const savedSettings = localStorage.getItem('openJobSettings')
        if (savedSettings) {
          const settings = JSON.parse(savedSettings)
          const providerConfig = settings.providers[aiProvider]
          
          if (providerConfig) {
            switch (aiProvider) {
              case 'openai':
                aiResult = await AIService.callOpenAI(prompt, providerConfig.apiKey, aiModel)
                break
              case 'gemini':
                aiResult = await AIService.callGemini(prompt, providerConfig.apiKey, aiModel)
                break
              case 'ollama':
                aiResult = await AIService.callOllama(prompt, providerConfig.host || 'http://localhost:11434', aiModel)
                break
              case 'custom':
                aiResult = await AIService.callCustomProvider(prompt, providerConfig.baseUrl, providerConfig.apiKey, aiModel)
                break
              default:
                aiResult = null
            }
          }
        }
      } else {
        // Fall back to default provider if no selection
        const providerCfg = getProviderConfig()
        if (providerCfg && providerCfg.provider) {
          const { provider, settings } = providerCfg
          switch (provider) {
            case 'openai':
              aiResult = await AIService.callOpenAI(prompt, settings.apiKey, settings.model || 'gpt-4o-mini')
              break
            case 'gemini':
              aiResult = await AIService.callGemini(prompt, settings.apiKey)
              break
            case 'ollama':
              aiResult = await AIService.callOllama(prompt, settings.host || 'http://localhost:11434', settings.model || 'qwen2.5:7b')
              break
            case 'custom':
              aiResult = await AIService.callCustomProvider(prompt, settings.baseUrl, settings.apiKey, settings.model)
              break
            default:
              aiResult = null
          }
        }
      }

      let data = aiResult?.data || null
      
      // Handle cases where AI returns malformed JSON or markdown-wrapped content
      if (!data || typeof data !== 'object') {
        // Try to extract JSON from the response if it's wrapped in markdown
        if (aiResult && typeof aiResult.data === 'string') {
          try {
            let content = aiResult.data.trim()
            
            // Remove markdown code blocks if present
            if (content.startsWith('```json')) {
              content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
            } else if (content.startsWith('```')) {
              content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
            }
            
            // Try to find JSON content if it's embedded in other text
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              content = jsonMatch[0]
            }
            
            // Attempt to parse the cleaned content
            data = JSON.parse(content)
          } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', parseError)
            console.error('Raw AI response:', aiResult.data)
            console.error('AI Provider:', aiProvider)
            console.error('AI Model:', aiModel)
            
            // Try to provide more specific error information
            let specificError = 'AI returned malformed data. The response could not be parsed as valid JSON.'
            if (aiResult.data && aiResult.data.includes('error')) {
              specificError = 'AI service returned an error. Please check your API key and model configuration.'
            } else if (aiResult.data && aiResult.data.length < 50) {
              specificError = 'AI service returned a very short response. The model might not be working properly.'
            } else if (!aiResult.data) {
              specificError = 'AI service returned no data. Please check your API key and internet connection.'
            }
            
            throw new Error(specificError)
          }
        } else {
          throw new Error('AI did not return structured data')
        }
      }

      const urlObj = (() => { try { return new URL(newJob.jobUrl) } catch { return null } })()
      const fallbackSource = urlObj ? urlObj.hostname : 'Job Posting'

      // Check if job description is complete or was truncated
      let jobDescription = data.jobDescription || data.description || data.notes || ''
      let isDescriptionComplete = true
      
      // If the AI response indicates truncation or the description seems incomplete
      if (isLongText && (jobDescription.length < pageText.length * 0.3)) {
        // The description seems too short compared to the original text
        isDescriptionComplete = false
        // Use a fallback extraction method
        jobDescription = extractJobDescriptionFallback(pageText)
      }

      setNewJob(prev => ({
        ...prev,
        company: data.company || prev.company,
        role: data.role || prev.role,
        location: data.location || prev.location,
        source: data.source || fallbackSource,
        status: data.status && ['saved','applied','interview','offer','rejected'].includes(data.status) ? data.status : prev.status,
        deadline: data.deadline || prev.deadline,
        nextAction: data.nextAction || prev.nextAction,
        jobDescription: jobDescription || prev.jobDescription,
        salary: data.salary || prev.salary,
        jobUrl: data.jobUrl || prev.jobUrl,
        appliedDate: '',
        benefits: Array.isArray(data.benefits) ? data.benefits : (prev.benefits || []),
      }))

      // Show appropriate success message
      if (!isDescriptionComplete) {
        toast({ 
          title: 'Auto-filled with Partial Description', 
          description: 'Job details were extracted, but the full description may be incomplete due to length. Check and complete manually if needed.',
          duration: 8000
        })
      } else {
        toast({ title: 'Auto-filled from URL', description: 'Fields were populated from the job posting.' })
      }
    } catch (error) {
      console.error('Auto-fill error:', error)
      console.error('AI Provider:', aiProvider)
      console.error('AI Model:', aiModel)
      console.error('Job URL:', newJob.jobUrl)
      
      // Provide more helpful error messages for common issues
      let errorMessage = error.message
      if (error.message.includes('Unexpected end of JSON input') || error.message.includes('malformed data')) {
        errorMessage = 'The AI service returned incomplete or malformed data. This usually happens when the AI model doesn\'t follow the expected format. Try using a different AI model or provider.'
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
        title: 'Auto-fill failed', 
        description: errorMessage, 
        variant: 'destructive',
        duration: 10000,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Try to extract basic info from URL as fallback
              try {
                const url = new URL(newJob.jobUrl)
                const hostname = url.hostname.replace('www.', '')
                const company = hostname.split('.')[0]
                
                setNewJob(prev => ({
                  ...prev,
                  company: company.charAt(0).toUpperCase() + company.slice(1),
                  source: hostname,
                  jobDescription: 'Please add job description manually'
                }))
                
                toast({
                  title: 'Basic info extracted',
                  description: 'Extracted company name from URL. Please fill in other details manually.',
                  duration: 5000
                })
              } catch (urlError) {
                console.error('URL parsing failed:', urlError)
              }
            }}
            className="ml-2"
          >
            Extract from URL
          </Button>
        )
      })
    } finally {
      setIsAutoFilling(false)
    }
  }

  const getJobsByStatus = (status) => {
    return filteredJobs.filter(job => job.status === status)
  }

  const getCardAccent = (job) => {
    // Use an accent if salary present or interview/offer status; otherwise neutral
    if (job.status === 'offer') return 'border-l-green-500'
    if (job.status === 'interview') return 'border-l-yellow-500'
    if (job.salary) return 'border-l-blue-500'
    return 'border-l-gray-500'
  }

  // -------- Skill Gap Analysis helpers ---------
  const normalizeSkill = (s) => (s || '').toString().trim().toLowerCase()

  // Extract resume skills from saved profile: combines explicit skills plus extraction from summary/experiences
  const extractResumeSkills = () => {
    const profile = resumeProfile || {}
    
    const personalSummary = profile?.personalInfo?.summary || ''
    const experienceText = (profile?.experiences || [])
      .map(exp => [exp.role, exp.company, ...(exp.bullets || [])].filter(Boolean).join('\n'))
      .join('\n')
    const projectsText = (profile?.projects || [])
      .map(p => [p.name, p.description].filter(Boolean).join('\n'))
      .join('\n')
    const explicitSkills = Array.isArray(profile?.skills) ? profile.skills : []
    
    const combined = [personalSummary, experienceText, projectsText, explicitSkills.join(', ')].filter(Boolean).join('\n')
    const extracted = extractFromResume(combined)
    
    const merged = new Set([
      ...extracted,
      ...explicitSkills.map(normalizeSkill),
    ])
    
    return Array.from(merged)
  }

  // Extract job skills from current job description/notes
  const extractJobSkills = async (useAI = false, aiProvider = null, aiModel = null) => {
    const jd = (viewJob?.jobDescription || viewJob?.notes || '')
    
    if (!jd || jd.trim().length === 0) {
      throw new Error('No job description available to analyze')
    }
    
    if (useAI) {
      if (!aiProvider || !aiModel) {
        throw new Error('AI provider and model must be specified for AI-enhanced extraction')
      }
      
      // Get AI settings from localStorage (same structure as CV Import)
      const savedSettings = localStorage.getItem('openJobSettings')
      if (!savedSettings) {
        throw new Error('AI providers not configured. Please configure your AI provider in Settings.')
      }
      
      const settings = JSON.parse(savedSettings)
      const providerConfig = settings.providers?.[aiProvider]
      
      if (!providerConfig) {
        throw new Error(`${aiProvider} is not configured. Please configure it in Settings first.`)
      }
      
      if (!providerConfig.enabled) {
        throw new Error(`${aiProvider} is not enabled. Please enable it in Settings first.`)
      }
      
      // Validate Ollama-specific configuration
      if (aiProvider.toLowerCase() === 'ollama') {
        if (!providerConfig.host) {
          throw new Error('Ollama host is not configured. Please set the host URL in Settings.')
        }
        
        console.log(`Ollama configuration: host=${providerConfig.host}, model=${aiModel}`)
        
        // Test Ollama connection before proceeding
        try {
          console.log('Testing Ollama connection before skill extraction...')
          const testResult = await AIService.testConnection('ollama', providerConfig)
          if (!testResult.success) {
            throw new Error(`Ollama connection test failed: ${testResult.error}`)
          }
          console.log('Ollama connection test successful')
          
          // Also validate the specific model
          console.log(`Validating Ollama model ${aiModel}...`)
          const modelValidation = await AIService.validateOllamaModel(providerConfig.host, aiModel)
          if (!modelValidation.success) {
            console.error('Model validation failed:', modelValidation.error)
            throw new Error(`Model validation failed: ${modelValidation.error}`)
          }
          console.log('Ollama model validation successful:', modelValidation.message)
          
        } catch (testError) {
          console.error('Ollama connection or model validation failed:', testError)
          throw new Error(`Cannot use Ollama: ${testError.message}. Please check if Ollama is running and the model is available.`)
        }
      }
      
      const aiConfig = {
        enabled: true,
        provider: aiProvider,
        settings: {
          ...providerConfig,
          model: aiModel
        }
      }
      
      console.log(`Using AI provider ${aiProvider} with model ${aiModel} for skill extraction`)
      return await extractFromJobDescription(jd, aiConfig)
    }
    
    console.log('Using taxonomy-based skill extraction (no AI)')
    return await extractFromJobDescription(jd)
  }

  const handleExtractSkills = async (useAI = false, aiProvider = null, aiModel = null) => {
    if (!viewJob) return
    setIsExtractingSkills(true)
    try {
      const jobSkills = await extractJobSkills(useAI, aiProvider, aiModel)
      const resumeSkills = extractResumeSkills()
      
      setExtractedJobSkills(jobSkills)
      setExtractedResumeSkills(resumeSkills)
      
      // Automatically run skill comparison if we have both job and resume skills
      if (jobSkills.length > 0 && resumeSkills.length > 0) {
        const { matches, score } = scoreSkills(jobSkills, resumeSkills)
        const buckets = {
          strong: matches.filter(m => m.status === 'strong'),
          partial: matches.filter(m => m.status === 'partial'),
          missing: matches.filter(m => m.status === 'missing'),
        }
        const analysis = { 
          jobId: String(viewJob.id), 
          resumeId: 'default', 
          extractedJobSkills: jobSkills, 
          resumeSkills, 
          matches, 
          score, 
          buckets, 
          generatedAt: new Date().toISOString(),
          overallScore: score.value
        }
        setSkillAnalysis(analysis)
        
        toast({ 
          title: 'Skills Analyzed', 
          description: `Found ${jobSkills.length} job skills, ${resumeSkills.length} resume skills. Match score: ${Math.round(analysis.overallScore)}%` 
        })
      } else {
        // Clear previous comparison when no skills to compare
        setSkillAnalysis(null)
        
        toast({ 
          title: 'Skills Extracted', 
          description: `Found ${jobSkills.length} job skills and ${resumeSkills.length} resume skills.` 
        })
      }
    } catch (error) {
      console.error('Error extracting skills:', error)
      
      // Provide more helpful error messages for common issues
      let errorMessage = error.message || 'Failed to extract and analyze skills'
      let errorTitle = 'Analysis Failed'
      
      if (useAI && aiProvider) {
        if (aiProvider.toLowerCase() === 'ollama') {
          if (error.message.includes('connection test failed')) {
            errorTitle = 'Ollama Connection Failed'
            errorMessage = 'Cannot connect to Ollama. Please check:\n• Ollama is running (ollama serve)\n• Host URL is correct (http://localhost:11434)\n• No firewall blocking the connection'
          } else if (error.message.includes('timed out')) {
            errorTitle = 'Ollama Request Timed Out'
            errorMessage = 'The request to Ollama took too long. This may happen with:\n• Large job descriptions\n• Slow models\n• High system load\n\nTry using a faster model or shorter job description.'
          } else if (error.message.includes('Invalid JSON response')) {
            errorTitle = 'Ollama Response Error'
            errorMessage = 'Ollama returned an invalid response. This may indicate:\n• Model is not working properly\n• Model needs to be restarted\n• Try a different model or restart Ollama'
          } else if (error.message.includes('Model validation failed')) {
            errorTitle = 'Ollama Model Not Found'
            errorMessage = 'The selected model is not available. Please:\n• Download the model: ollama pull [model-name]\n• Check available models: ollama list\n• Restart Ollama if needed'
          } else if (error.message.includes('not found')) {
            errorTitle = 'Ollama Model Not Found'
            errorMessage = 'The selected model is not available. Please:\n• Download the model: ollama pull [model-name]\n• Check available models: ollama list\n• Restart Ollama if needed'
          }
        } else if (error.message.includes('not configured')) {
          errorTitle = 'AI Provider Not Configured'
          errorMessage = `${aiProvider} is not properly configured. Please check your settings.`
        } else if (error.message.includes('not enabled')) {
          errorTitle = 'AI Provider Disabled'
          errorMessage = `${aiProvider} is disabled. Please enable it in Settings.`
        }
      }
      
      toast({ 
        title: errorTitle, 
        description: errorMessage, 
        variant: 'destructive' 
      })
    } finally {
      setIsExtractingSkills(false)
    }
  }

  // Load available models when provider changes (using same approach as CV Import)
  const loadModelsForProvider = async (provider) => {
    if (!provider) return
    
    console.log(`Loading models for skill extraction provider: ${provider}`)
    
    try {
      // First try to load from localStorage cache (same as CV Import)
      const savedModels = localStorage.getItem('jobm8_available_models')
      if (savedModels) {
        const allModels = JSON.parse(savedModels)
        if (allModels[provider] && allModels[provider].length > 0) {
          console.log(`Loading cached models for ${provider}:`, allModels[provider])
          setSkillExtractionModels(allModels[provider])
          // Auto-select first model if none selected
          if (!skillExtractionModel && allModels[provider].length > 0) {
            setSkillExtractionModel(allModels[provider][0].id || allModels[provider][0].name)
          }
          return
        }
      }

      // If no cached models, try to load from settings (same as CV Import)
      const savedSettings = localStorage.getItem('openJobSettings')
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        const providerConfig = settings.providers?.[provider]
        
        if (providerConfig) {
          console.log(`Using provider config for ${provider}:`, providerConfig)
          
          const result = await AIService.testConnection(provider, providerConfig)
          console.log(`Test connection result for ${provider}:`, result)
          
          if (result.success && result.models) {
            console.log(`Setting skill extraction models:`, result.models)
            setSkillExtractionModels(result.models)
            // Auto-select first model if none selected
            if (!skillExtractionModel && result.models.length > 0) {
              const firstModel = result.models[0].id || result.models[0].name
              console.log(`Auto-selecting first model: ${firstModel}`)
              setSkillExtractionModel(firstModel)
            }
            
            // Cache the models
            const currentCache = JSON.parse(localStorage.getItem('jobm8_available_models') || '{}')
            currentCache[provider] = result.models
            localStorage.setItem('jobm8_available_models', JSON.stringify(currentCache))
            
            toast({
              title: 'Models loaded',
              description: `Found ${result.models.length} models for ${provider}`,
            })
          } else {
            console.log(`No models found for ${provider}, result:`, result)
            setSkillExtractionModels([])
            toast({
              title: 'Failed to load models',
              description: result.error || `Could not load models for ${provider}. Please check your configuration.`,
              variant: 'destructive'
            })
          }
        } else {
          console.log(`No configuration found for ${provider}`)
          setSkillExtractionModels([])
          toast({
            title: 'Provider not configured',
            description: `Please configure ${provider} in Settings first.`,
            variant: 'destructive'
          })
        }
      } else {
        console.log('No openJobSettings found')
        setSkillExtractionModels([])
        toast({
          title: 'Settings not found',
          description: 'Please configure your AI providers in Settings first.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading models:', error)
      setSkillExtractionModels([])
      toast({
        title: 'Error loading models',
        description: error.message || 'An unexpected error occurred while loading models.',
        variant: 'destructive'
      })
    }
  }

  // Load models when provider changes
  useEffect(() => {
    console.log('useEffect triggered for skillExtractionProvider:', skillExtractionProvider)
    loadModelsForProvider(skillExtractionProvider)
  }, [skillExtractionProvider])

  // Initial load
  useEffect(() => {
    console.log('Initial load of models on component mount')
    loadModelsForProvider(skillExtractionProvider)
  }, [])

  const scoreSkills = (jobSkills, resumeSkills) => {
    const matches = compareSkills(jobSkills, resumeSkills)
    
    // Calculate score from matches
    let strong = 0, partial = 0, missing = 0
    matches.forEach(m => {
      if (m.status === 'strong') strong += 1
      else if (m.status === 'partial') partial += 1
      else missing += 1
    })
    
    // Calculate score: (strong + 0.5*partial) / total_job_skills * 100
    // This properly penalizes missing skills
    const totalJobSkills = jobSkills.length
    const weightedScore = strong + (partial * 0.5)
    const value = Math.round((weightedScore / totalJobSkills) * 100)
    
    let band = 'low'
    if (value >= 75) band = 'high'
    else if (value >= 50) band = 'medium'
    
    return { matches, score: { value, band } }
  }

  const runSkillAnalysis = async () => {
    if (!viewJob) return
    setIsScoring(true)
    try {
      let jobSkills = extractedJobSkills && extractedJobSkills.length > 0
        ? extractedJobSkills
        : await extractJobSkills() // Make sure to await if we need to extract fresh skills
      
      if (jobSkills.length === 0) {
        toast({
          title: 'No Job Skills',
          description: 'Please analyze skills from job description first.',
          variant: 'destructive'
        })
        setSkillAnalysis({ error: 'No job skills detected' })
        return
      }
      
      jobSkills = jobSkills.slice(0, 20)
      
      // Always get the latest resume skills from the profile to stay in sync
      const resumeSkills = extractResumeSkills()
      setExtractedResumeSkills(resumeSkills)
      
      if (resumeSkills.length === 0) {
        toast({
          title: 'No Resume Skills',
          description: 'Please upload a resume or add skills manually.',
          variant: 'destructive'
        })
        return
      }
      
      const { matches, score } = scoreSkills(jobSkills, resumeSkills)
      const buckets = {
        strong: matches.filter(m => m.status === 'strong'),
        partial: matches.filter(m => m.status === 'partial'),
        missing: matches.filter(m => m.status === 'missing'),
      }
      const analysis = { jobId: String(viewJob.id), resumeId: 'default', extractedJobSkills: jobSkills, resumeSkills, matches, score, buckets, generatedAt: new Date().toISOString() }
      setSkillAnalysis(analysis)
      saveSkillAnalysis(viewJob.id, analysis)
      
      toast({
        title: 'Analysis Refreshed',
        description: `Skills compared successfully. Match score: ${Math.round(score.value)}%`
      })
      
    } finally {
      setIsScoring(false)
    }
  }

  // Function to refresh skills and re-run analysis when resume profile changes
  const refreshSkillsFromProfile = async () => {
    if (!viewJob) return
    
    try {
      // Extract fresh resume skills from the current profile
      const freshResumeSkills = extractResumeSkills()
      setExtractedResumeSkills(freshResumeSkills)
      
      // Re-run skill analysis with updated skills
      await runSkillAnalysis()
      
              toast({
          title: "Skills Refreshed",
          description: "Skills updated from resume profile and analysis recalculated.",
          duration: 2000,
        })
    } catch (error) {
      console.error('Error refreshing skills:', error)
              toast({
          title: "Refresh Failed",
          description: "Failed to refresh skills from resume profile.",
          variant: "destructive",
          duration: 3000,
        })
    }
  }

  const addSkillToResume = async (skillName) => {
    try {
      // Convert skill name to PROPER case (first letter of each word capitalized)
      const properSkillName = skillName.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
      
      // Check for duplicates case-insensitively in extracted resume skills
      const normalizedNewSkill = properSkillName.toLowerCase().trim()
      const hasDuplicate = extractedResumeSkills.some(existingSkill => 
        existingSkill.toLowerCase().trim() === normalizedNewSkill
      )
      
      if (!hasDuplicate) {
        const updatedResumeSkills = [...extractedResumeSkills, properSkillName]
        setExtractedResumeSkills(updatedResumeSkills)
        
        // Save to localStorage
        localStorage.setItem('extractedResumeSkills', JSON.stringify(updatedResumeSkills))
        
        // Also update the main profile in localStorage so it appears in Resume Builder
        addSkillToProfile(properSkillName)
        
        // Show immediate visual feedback
        toast({
          title: "✅ Skill Added!",
          description: `"${properSkillName}" has been added to your resume skills.`,
          duration: 3000,
        })
        
        // Add visual feedback to the skill tag
        setRecentlyAddedSkills(prev => new Set([...prev, properSkillName]))
        setTimeout(() => {
          setRecentlyAddedSkills(prev => {
            const newSet = new Set(prev)
            newSet.delete(properSkillName)
            return newSet
          })
        }, 2000)
        
        // Immediately update the skill analysis buckets to move the skill to Strong Match
        if (skillAnalysis) {
          // Remove the skill from missing and partial buckets
          const updatedBuckets = {
            strong: [...skillAnalysis.buckets.strong, { skill: properSkillName, confidence: 1.0, status: 'strong' }],
            partial: skillAnalysis.buckets.partial.filter(s => s.skill !== skillName && s.skill !== properSkillName),
            missing: skillAnalysis.buckets.missing.filter(s => s.skill !== skillName && s.skill !== properSkillName),
          }
          
          // Update the skill analysis immediately
          setSkillAnalysis(prev => ({
            ...prev,
            buckets: updatedBuckets
          }))
          
          // Force a re-render by updating the skill analysis with the new resume skills
          const updatedSkillAnalysis = {
            ...skillAnalysis,
            buckets: updatedBuckets,
            resumeSkills: [...extractedResumeSkills, properSkillName]
          }
          setSkillAnalysis(updatedSkillAnalysis)
          saveSkillAnalysis(viewJob.id, updatedSkillAnalysis)
        }
        
        // Show success feedback after analysis
        toast({
          title: "Score Updated!",
          description: `"${properSkillName}" moved to Strong Match and score recalculated.`,
          duration: 2000,
        })
      } else {
        // Skill already exists - find the existing one and update it if needed
        const existingSkill = extractedResumeSkills.find(skill => 
          skill.toLowerCase().trim() === normalizedNewSkill
        )
        
        if (existingSkill !== properSkillName) {
          // Update the existing skill with the properly capitalized version
          const updatedResumeSkills = extractedResumeSkills.map(skill => 
            skill.toLowerCase().trim() === normalizedNewSkill ? properSkillName : skill
          )
          setExtractedResumeSkills(updatedResumeSkills)
          localStorage.setItem('extractedResumeSkills', JSON.stringify(updatedResumeSkills))
          
          // Also update the main profile
          addSkillToProfile(properSkillName)
          
          // Update skill analysis to move the skill to Strong Match
          if (skillAnalysis) {
            const updatedBuckets = {
              strong: [...skillAnalysis.buckets.strong, { skill: properSkillName, confidence: 1.0, status: 'strong' }],
              partial: skillAnalysis.buckets.partial.filter(s => s.skill !== skillName && s.skill !== properSkillName),
              missing: skillAnalysis.buckets.missing.filter(s => s.skill !== skillName && s.skill !== properSkillName),
            }
            
            // Force a re-render by updating the skill analysis with the new resume skills
            const updatedSkillAnalysis = {
              ...skillAnalysis,
              buckets: updatedBuckets,
              resumeSkills: [...extractedResumeSkills, properSkillName]
          }
            setSkillAnalysis(updatedSkillAnalysis)
            saveSkillAnalysis(viewJob.id, updatedSkillAnalysis)
          }
          
          toast({
            title: "Skill Updated!",
            description: `"${existingSkill}" updated to "${properSkillName}" with proper capitalization.`,
            duration: 3000,
          })
        } else {
          // Skill already exists with same capitalization
          toast({
            title: "Already Added",
            description: `"${properSkillName}" is already in your resume skills.`,
            duration: 2000,
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add skill to resume.",
        variant: "destructive",
        duration: 4000,
      })
    }
  }

  const ignoreSkill = (skillName) => {
    try {
      // Remove the skill from the current analysis buckets
      if (skillAnalysis) {
        const updatedBuckets = {
          strong: skillAnalysis.buckets.strong.filter(s => s.skill !== skillName),
          partial: skillAnalysis.buckets.partial.filter(s => s.skill !== skillName),
          missing: skillAnalysis.buckets.missing.filter(s => s.skill !== skillName),
        }
        
        // Update the skill analysis with the ignored skill removed
        const updatedAnalysis = {
          ...skillAnalysis,
          buckets: updatedBuckets
        }
        setSkillAnalysis(updatedAnalysis)
        saveSkillAnalysis(viewJob.id, updatedAnalysis)
        
        // Add visual feedback to the skill tag
        setRecentlyIgnoredSkills(prev => new Set([...prev, skillName]))
        setTimeout(() => {
          setRecentlyIgnoredSkills(prev => {
            const newSet = new Set(prev)
            newSet.delete(skillName)
            return newSet
          })
        }, 2000)
        
        toast({
          title: "👋 Skill Ignored",
          description: `"${skillName}" has been removed from the analysis.`,
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to ignore skill.",
        variant: "destructive",
        duration: 4000,
      })
    }
  }

  // Function to add a single skill to the profile without duplication
  const addSkillToProfile = (skillName) => {
    try {
      const savedProfile = localStorage.getItem('openJobProfile')
      if (savedProfile) {
        const profile = JSON.parse(savedProfile)
        // Check for duplicates case-insensitively
        const normalizedNewSkill = skillName.toLowerCase().trim()
        const hasDuplicate = profile.skills.some(existingSkill => 
          existingSkill.toLowerCase().trim() === normalizedNewSkill
        )
        
        if (!hasDuplicate) {
          profile.skills.push(skillName)
          localStorage.setItem('openJobProfile', JSON.stringify(profile))
          return true
        } else {
          // If duplicate exists, replace the existing one with the properly capitalized version
          const existingIndex = profile.skills.findIndex(existingSkill => 
            existingSkill.toLowerCase().trim() === normalizedNewSkill
          )
          if (existingIndex !== -1) {
            profile.skills[existingIndex] = skillName
            localStorage.setItem('openJobProfile', JSON.stringify(profile))
            return true
          }
        }
      }
      return false
    } catch (error) {
      console.error('Failed to add skill to profile:', error)
      return false
    }
  }

  const openGoogleSearch = (skillName) => {
    const searchQuery = encodeURIComponent(`define: ${skillName} skill`)
    const googleUrl = `https://www.google.com/search?q=${searchQuery}`
    window.open(googleUrl, '_blank')
  }

  const handleTailorResume = () => {
    if (!viewJob) {
      toast({
        title: "No job selected",
        description: "Please select a job to tailor your resume for.",
        variant: "destructive"
      })
      return
    }

    // Navigate to the resume tailoring view
    setActiveView('tailor-resume')
    
    toast({
      title: "Resume Tailoring",
      description: "Opening resume tailoring interface for this job opportunity.",
    })
  }

  // Component to render resume using exact same layout as Master Resume
  const MasterResumeLayout = ({ profile }) => {
    console.log('MasterResumeLayout called with profile:', profile)

    // Add defensive checks to prevent crashes
    if (!profile) {
      console.log('No profile provided to MasterResumeLayout')
      return <div className="p-8 text-center text-muted-foreground">No profile data available</div>
    }

    const { personalInfo, experiences, education, skills } = profile || {}

    console.log('Profile structure:', { personalInfo, experiences, education, skills })

    // Ensure personalInfo exists
    const safePersonalInfo = personalInfo || {}

    const contactItems = [
      safePersonalInfo.email && `Email: ${safePersonalInfo.email}`,
      safePersonalInfo.phone && `Phone: ${safePersonalInfo.phone}`,
      safePersonalInfo.location && safePersonalInfo.location,
      safePersonalInfo.linkedin && safePersonalInfo.linkedin,
      safePersonalInfo.website && safePersonalInfo.website,
    ].filter(Boolean)

    const formatRange = (start, end) => {
      if (start && end) return `${start} — ${end}`
      if (start && !end) return `${start} — Present`
      return end || ''
    }

    return (
      <div className="space-y-6 p-8">
        {/* Header */}
        <div className="space-y-1">
          {safePersonalInfo.name && (
            <h2 className="text-2xl font-bold tracking-tight">{safePersonalInfo.name}</h2>
          )}
          {contactItems.length > 0 && (
            <p className="text-sm text-muted-foreground">{contactItems.join(' • ')}</p>
          )}
        </div>

        {safePersonalInfo.summary && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Summary</h3>
            <p className="leading-relaxed">{safePersonalInfo.summary}</p>
            <Separator />
          </div>
        )}

        {/* Experience */}
        {Array.isArray(experiences) && experiences.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Experience</h3>
            <div className="space-y-4">
              {experiences.map((exp, index) => {
                if (!exp) return null
                return (
                  <div key={exp.id || index} className="space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <p className="font-medium">
                        {exp.role || 'Role'}{exp.company ? `, ${exp.company}` : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatRange(exp.startDate, exp.endDate)}</p>
                    </div>
                    {Array.isArray(exp.bullets) && exp.bullets.filter(Boolean).length > 0 && (
                      <ul className="list-disc ml-6 space-y-1">
                        {exp.bullets.filter(Boolean).map((b, idx) => (
                          <li key={idx} className="text-sm leading-snug">{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
            <Separator />
          </div>
        )}

        {/* Education */}
        {Array.isArray(education) && education.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Education</h3>
            <div className="space-y-3">
              {education.map((edu, index) => {
                if (!edu) return null
                return (
                  <div key={edu.id || index} className="space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <p className="font-medium">
                        {(edu.degree || 'Degree') + (edu.field ? `, ${edu.field}` : '')}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatRange(edu.startDate, edu.endDate)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{edu.school}</p>
                    {edu.gpa && (
                      <p className="text-sm">GPA: {edu.gpa}</p>
                    )}
                  </div>
                )
              })}
            </div>
            <Separator />
          </div>
        )}

        {/* Skills */}
        {Array.isArray(skills) && skills.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <Badge key={`${s}-${i}`} variant="secondary" className="text-xs">{s || 'Skill'}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Validation function to detect fake data
  const validateAIResponse = (response, originalData, dataType) => {
    if (!response) return false

    // Common fake data patterns to detect
    const fakePatterns = [
      /john\.?doe/i,
      /jane\.?doe/i,
      /techcorp/i,
      /startupxyz/i,
      /corporate solutions/i,
      /555.*123.*4567/i,
      /example\.com/i,
      /lorem ipsum/i,
      /placeholder/i,
      /sample/i
    ]

    // Check if response contains fake patterns
    const containsFakeData = fakePatterns.some(pattern => pattern.test(response))
    if (containsFakeData) {
      console.error(`❌ FAKE DATA DETECTED in ${dataType}:`, response)
      return false
    }

    return true
  }

  // Step-by-step tailoring functions
  const tailorProfessionalSummary = async (profile, jobDescription) => {
    const currentSummary = profile.personalInfo?.summary || ''

    console.log('=== SUMMARY TAILORING DEBUG ===')
    console.log('Original summary:', currentSummary)
    console.log('User name:', profile.personalInfo?.name)

    if (!currentSummary || currentSummary === 'No summary provided') {
      console.log('No summary to tailor, returning empty')
      return ''
    }

    const prompt = `STRICT INSTRUCTIONS: You are rewriting an existing professional summary. Use ONLY the information provided below.

CANDIDATE'S ACTUAL SUMMARY TO REWRITE:
"${currentSummary}"

JOB TO TAILOR FOR:
- Position: ${viewJob.role}
- Company: ${viewJob.company}
- Job description: ${viewJob.jobDescription}

TASK: Rewrite the above summary to better match the job. Keep the same experience level and qualifications. Make it more relevant to the position.

RULES:
- Use ONLY information from the original summary
- Do NOT add fake companies, names, or contact info
- Do NOT invent new skills or experience
- Keep it 2-3 sentences maximum
- Return ONLY the rewritten text

OUTPUT FORMAT: Just the rewritten summary text in JSON format, nothing else. Don't add the company's name to the summary.`

    console.log('Summary prompt being sent to AI:', prompt)

    // Load provider settings and pass them through to the AI call
    let providerConfig = {}
    try {
      const cfg = validateAIConfiguration()
      providerConfig = cfg?.providerConfig || {}
    } catch (e) {
      console.error('AI configuration invalid:', e)
      throw e
    }

    const response = await AIService.generateContent(prompt, aiProvider, { 
      ...providerConfig,
      model: aiModel
    })
    console.log('AI response for summary:', response)

    // Normalize response to a plain string
    let responseText = ''
    if (typeof response === 'string') {
      responseText = response
    } else if (response && typeof response === 'object') {
      if (typeof response.data === 'string') {
        responseText = response.data
      } else if (response.data && typeof response.data === 'object') {
        responseText = response.data.summary || response.data.text || ''
        if (!responseText) {
          const firstString = Object.values(response.data).find(v => typeof v === 'string')
          if (typeof firstString === 'string') responseText = firstString
        }
      }
    }

    // Validate response doesn't contain fake data
    if (!validateAIResponse(responseText, currentSummary, 'summary')) {
      console.log('Using original summary due to fake data detection')
      return currentSummary
    }

    return responseText?.trim() || currentSummary
  }

  const tailorRelevantExperience = async (profile, jobDescription, jobSkills) => {
    const experiences = profile.experiences || []

    console.log('=== EXPERIENCE TAILORING DEBUG ===')
    console.log('Original experiences:', experiences)

    if (experiences.length === 0) {
      console.log('No experiences to tailor')
      return []
    }

    // AI experience tailoring is mandatory for Step 2
    if (aiProvider && aiModel) {
      try {
        const experienceText = experiences.map((exp, index) => `
EXPERIENCE ${index + 1}:
- Position: ${exp.role}
- Company: ${exp.company}
- Dates: ${exp.startDate} to ${exp.current ? 'Present' : exp.endDate}
- Responsibilities: ${Array.isArray(exp.bullets) ? exp.bullets.join('; ') : 'None listed'}
`).join('\n')

        const jobSkillsList = (jobSkills || []).map(s => s && (s.name || s.skill || s)).filter(Boolean).join(', ')

        const prompt = `REWRITE EXISTING EXPERIENCE ONLY. Do not invent anything.

ORIGINAL EXPERIENCE:
${experienceText}

TARGET JOB: ${viewJob.role} at ${viewJob.company}

JOB DESCRIPTION:
${jobDescription}

EXTRACTED JOB SKILLS:
${jobSkillsList}

TASK: Select the most relevant positions and REWRITE bullet points to emphasize skills relevant to the target job. Use EXACT company names and job titles from the original.

STRICT RULES FOR ATS-FRIENDLY BULLETS:
- Begin each bullet with a strong action verb
- Incorporate EXACT keywords from EXTRACTED JOB SKILLS when truthful
- Quantify impact with numbers/metrics where possible
- Keep each bullet concise (max ~20 words); no first-person or pronouns
- Do NOT add company names or change job titles
- Do NOT invent projects, employers, dates, or certifications.
- Feel free to rewrite, combine or remove bulletpoints to make them more relevant to the target job.
- Prefer concrete technologies/tools mentioned in the job description ONLY if they are plausibly part of the original responsibilities

OUTPUT FORMAT:: Just the rewritten experience text in JSON format, nothing else. JSON array with this format:
[{"job_title": "EXACT TITLE", "company": "EXACT COMPANY", "start_date": "EXACT DATE", "end_date": "EXACT DATE", "key_achievements_responsibilities": ["rewritten bullet 1", "rewritten bullet 2"]}]`

        // Load provider settings and pass them through to the AI call
        let providerConfig = {}
        try {
          const cfg = validateAIConfiguration()
          providerConfig = cfg?.providerConfig || {}
        } catch (e) {
          console.error('AI configuration invalid:', e)
          throw e
        }

        console.log('Experience prompt being sent to AI:', prompt)
        const response = await AIService.generateContent(prompt, aiProvider, { 
          ...providerConfig,
          model: aiModel,
          _ollama: { timeoutMs: 120000, numPredict: 1024, warmup: true }
        })

        // Try to parse JSON array from response
        let parsed
        try {
          if (typeof response === 'string') {
            const jsonMatch = response.match(/\[[\s\S]*\]/)
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response)
          } else if (response && typeof response === 'object') {
            const data = response.data || response
            if (Array.isArray(data)) {
              parsed = data
            } else if (typeof data === 'string') {
              const jsonMatch = data.match(/\[[\s\S]*\]/)
              parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(data)
            } else if (data && typeof data === 'object') {
              // Search for an array of experiences inside an object (due to response_format: json_object)
              const candidateArrays = []
              const stack = [data]
              while (stack.length) {
                const node = stack.pop()
                if (!node || typeof node !== 'object') continue
                Object.values(node).forEach(v => {
                  if (Array.isArray(v)) candidateArrays.push(v)
                  else if (v && typeof v === 'object') stack.push(v)
                })
              }
              parsed = candidateArrays.find(arr => Array.isArray(arr) && arr.some(x => x && typeof x === 'object' && ('job_title' in x || 'company' in x))) || null
            }
          }
        } catch (parseError) {
          console.error('Experience parsing failed:', parseError)
          throw new Error('AI returned an invalid format for experience tailoring')
        }

        // Validate no fake data and that roles/companies match user's experiences
        if (Array.isArray(parsed) && parsed.length > 0) {
          const isValid = parsed.every(exp => 
            experiences.some(orig => (orig.company || '') === (exp.company || '') && (orig.role || '') === (exp.job_title || ''))
          )

          if (isValid) {
            // Ensure bullets are strings and trimmed; also cap bullets per experience to 5
            const normalize = (s) => (s || '').toLowerCase().trim()
            const skillTerms = Array.from(new Set(
              (jobSkills || [])
                .map(s => s && (s.name || s.skill || s))
                .filter(Boolean)
                .map(normalize)
            ))

            const rewriteATS = (text) => {
              if (!text) return ''
              let t = String(text).replace(/^[-•·\s]+/, '').trim()
              // Remove first-person pronouns
              t = t.replace(/\b(I|we|our|my|me|us)\b/gi, '').replace(/\s{2,}/g, ' ').trim()
              // Strengthen openings
              t = t.replace(/^responsible for\b/i, 'Managed')
                   .replace(/^participated in\b/i, 'Contributed to')
                   .replace(/^helped\b/i, 'Assisted')
                   .replace(/^worked on\b/i, 'Worked on')
              // Ensure starts with capital
              t = t.charAt(0).toUpperCase() + t.slice(1)
              // Trim length to ~25 words
              const words = t.split(/\s+/)
              if (words.length > 25) {
                t = words.slice(0, 25).join(' ')
              }
              // Remove trailing period
              t = t.replace(/[\.;:,\s]+$/, '')
              return t
            }

            const cleaned = parsed.map(exp => ({
              job_title: exp.job_title || '',
              company: exp.company || '',
              start_date: exp.start_date || '',
              end_date: exp.end_date || '',
              key_achievements_responsibilities: Array.isArray(exp.key_achievements_responsibilities)
                ? exp.key_achievements_responsibilities
                    .map(b => rewriteATS(b))
                    .filter(Boolean)
                    .slice(0, 5)
                : []
            }))
            console.log('Tailored experiences (AI):', cleaned)
            return cleaned
          } else {
            console.error('AI returned experience not matching original entries')
            throw new Error('AI returned experience not matching your original entries')
          }
        }
      } catch (error) {
        console.error('AI experience tailoring failed:', error)
        throw error
      }
    }

    // AI is required for Step 2; do not proceed with deterministic fallback
    throw new Error('AI experience tailoring did not return valid results')

    // Deterministic filtering path removed (AI mandatory). Code kept below for potential future use.
    const normalize = (s) => (s || '').toLowerCase().trim()
    const skillTerms = Array.from(new Set(
      (jobSkills || [])
        .map(s => s && (s.name || s.skill || s))
        .filter(Boolean)
        .map(normalize)
    ))

    const bulletRelevanceScore = (bullet) => {
      const lc = normalize(bullet)
      if (!lc) return 0
      let score = 0
      // Match any extracted job skill as a substring (case-insensitive)
      for (const term of skillTerms) {
        if (!term) continue
        if (lc.includes(term)) score += 1
      }
      // Small boost for quantification/metrics
      if (/\d/.test(lc)) score += 0.2
      // Small boost for strong action verbs at the start
      if (/^(led|built|developed|designed|implemented|optimized|managed|launched|created|improved|reduced|increased|migrated|automated|delivered|architected)\b/i.test(bullet)) {
        score += 0.1
      }
      return score
    }

    const rewriteATS = (text) => {
      if (!text) return ''
      let t = String(text).replace(/^[-•·\s]+/, '').trim()
      // Remove first-person pronouns
      t = t.replace(/\b(I|we|our|my|me|us)\b/gi, '').replace(/\s{2,}/g, ' ').trim()
      // Strengthen openings
      t = t.replace(/^responsible for\b/i, 'Managed')
           .replace(/^participated in\b/i, 'Contributed to')
           .replace(/^helped\b/i, 'Assisted')
           .replace(/^worked on\b/i, 'Worked on')
      // Ensure starts with capital
      t = t.charAt(0).toUpperCase() + t.slice(1)
      // Trim length to ~25 words
      const words = t.split(/\s+/)
      if (words.length > 25) {
        t = words.slice(0, 25).join(' ')
      }
      // Remove trailing period
      t = t.replace(/[\.;:,\s]+$/, '')
      return t
    }

    // Keep up to 3 most relevant experiences (existing behavior),
    // but filter each one's bullets to the most relevant 3-5
    const tailoredExperiences = experiences.slice(0, 3).map(exp => {
      const originalBullets = Array.isArray(exp.bullets) ? exp.bullets.filter(Boolean) : []

      const ranked = originalBullets
        .map(text => ({ text, score: bulletRelevanceScore(text) }))
        .sort((a, b) => (b.score - a.score) || (b.text.length - a.text.length))

      // Prefer bullets that have a positive relevance score
      let selected = ranked.filter(r => r.score > 0).slice(0, 5).map(r => rewriteATS(r.text))

      // Fallback: if none matched skills, keep up to the first 3 original bullets to avoid empty sections
      if (selected.length === 0) {
        selected = originalBullets.slice(0, 3).map(rewriteATS)
      }

      return {
        job_title: exp.role || '',
        company: exp.company || '',
        start_date: exp.startDate || '',
        end_date: exp.current ? '' : (exp.endDate || ''),
        key_achievements_responsibilities: selected
      }
    })

    console.log('Tailored experiences (using real data):', tailoredExperiences)
    return tailoredExperiences

    const experienceText = experiences.map((exp, index) => `
EXPERIENCE ${index + 1}:
- Position: ${exp.role}
- Company: ${exp.company}
- Dates: ${exp.startDate} to ${exp.current ? 'Present' : exp.endDate}
- Responsibilities: ${Array.isArray(exp.bullets) ? exp.bullets.join('; ') : 'None listed'}
`).join('\n')

    const prompt = `REWRITE EXISTING EXPERIENCE ONLY. Do not invent anything.

ORIGINAL EXPERIENCE:
${experienceText}

TARGET JOB: ${viewJob.role} at ${viewJob.company}

TASK: Select most relevant 2-3 positions and rewrite bullet points to emphasize skills relevant to the target job. Use EXACT company names and job titles.

RETURN: JSON array with this format:
[{"job_title": "EXACT TITLE", "company": "EXACT COMPANY", "start_date": "EXACT DATE", "end_date": "EXACT DATE", "key_achievements_responsibilities": ["rewritten bullet 1", "rewritten bullet 2"]}]`

    const response = await AIService.generateContent(prompt, aiProvider, { model: aiModel })
    
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response)
      
      // Validate no fake data
      const isValid = parsed.every(exp => 
        experiences.some(orig => orig.company === exp.company && orig.role === exp.job_title)
      )
      
      if (!isValid) {
        console.error('AI returned fake experience data, using original')
        return tailoredExperiences
      }
      
      return parsed
    } catch (error) {
      console.error('Experience parsing failed:', error)
      return tailoredExperiences
    }

  }

  const tailorEducation = async (profile, jobDescription) => {
    const education = profile.education || []

    console.log('=== EDUCATION TAILORING DEBUG ===')
    console.log('Original education:', education)

    if (education.length === 0) {
      return []
    }

    // Skip AI and return real education data properly formatted
    const tailoredEducation = education.map(edu => ({
      school_university: edu.school || '',
      field_of_study: edu.field || '',
      degree: edu.degree || '',
      gpa: edu.gpa || '',
      start_date: edu.startDate || '',
      end_date: edu.endDate || ''
    }))

    console.log('Tailored education (using real data):', tailoredEducation)
    return tailoredEducation
  }

  const tailorSkills = async (profile, jobDescription, jobSkills) => {
    const currentSkills = profile.skills || []

    console.log('=== SKILLS TAILORING DEBUG ===')
    console.log('Original skills:', currentSkills)
    console.log('Job skills:', jobSkills)

    if (currentSkills.length === 0) {
      return []
    }

    // Skip AI and return real skills properly organized
    const tailoredSkills = [{
      category: "Skills",
      items: currentSkills.slice(0, 12) // Take up to 12 skills
    }]

    console.log('Tailored skills (using real data):', tailoredSkills)
    return tailoredSkills
  }

  // Helper function to generate formatted resume text from profile data
  const generateResumeText = (profile) => {
    const lines = []

    // Personal Information
    if (profile.personalInfo?.name) {
      lines.push(`**${profile.personalInfo.name}**`)
    }

    // Contact Information
    const contactParts = []
    if (profile.personalInfo?.email) contactParts.push(profile.personalInfo.email)
    if (profile.personalInfo?.phone) contactParts.push(`Phone: ${profile.personalInfo.phone}`)
    if (profile.personalInfo?.location) contactParts.push(profile.personalInfo.location)
    if (profile.personalInfo?.linkedin) contactParts.push(`LinkedIn: ${profile.personalInfo.linkedin}`)
    if (profile.personalInfo?.portfolio) contactParts.push(`Portfolio: ${profile.personalInfo.portfolio}`)

    if (contactParts.length > 0) {
      lines.push(contactParts.join(' • '))
      lines.push('')
    }

    // Professional Summary
    if (profile.personalInfo?.summary) {
      lines.push('**Summary**')
      lines.push(profile.personalInfo.summary)
      lines.push('')
    }

    // Work Experience
    if (profile.experiences?.length > 0) {
      lines.push('**Experience**')
      profile.experiences.forEach(exp => {
        const dateRange = exp.current ? `${exp.startDate} - Present` : `${exp.startDate} - ${exp.endDate}`
        lines.push(`**${exp.role} at ${exp.company}** - ${dateRange}`)
        if (exp.bullets?.length > 0) {
          exp.bullets.forEach(bullet => {
            lines.push(`• ${bullet}`)
          })
        }
        lines.push('')
      })
    }

    // Skills
    if (profile.skills?.length > 0) {
      lines.push('**Skills**')
      profile.skills.forEach(skill => {
        lines.push(`• ${skill}`)
      })
      lines.push('')
    }

    // Education
    if (profile.education?.length > 0) {
      lines.push('**Education**')
      profile.education.forEach(edu => {
        const dateRange = `${edu.startDate} - ${edu.endDate}`
        lines.push(`**${edu.degree} in ${edu.field}** from ${edu.school} - ${dateRange}`)
        if (edu.gpa) {
          lines.push(`GPA: ${edu.gpa}`)
        }
        lines.push('')
      })
    }

    // Projects
    if (profile.projects?.length > 0) {
      lines.push('**Projects**')
      profile.projects.forEach(project => {
        lines.push(`**${project.title || 'Untitled Project'}**`)
        if (project.description) {
          lines.push(`• ${project.description}`)
        }
        if (project.technologies?.length > 0) {
          lines.push(`• Technologies: ${project.technologies.join(', ')}`)
        }
        lines.push('')
      })
    }

    return lines.join('\n')
  }

  // Step-by-step resume tailoring
  const executeTailoringStep = async (stepIndex) => {
    if (!viewJob || !resumeProfile || !aiProvider || !aiModel) {
      toast({
        title: "Configuration Error",
        description: "Please ensure all settings are configured properly.",
        variant: "destructive"
      })
      return
    }

    setTailoringInProgress(true)

    try {
      const step = tailoringSteps[stepIndex]
      const profileToUse = resumeProfile
      const jobDescription = viewJob.jobDescription || 'No description provided'

      let result

      switch (step.id) {
        case 'summary':
          result = await tailorProfessionalSummary(profileToUse, jobDescription)
          break
        case 'experience':
          result = await tailorRelevantExperience(profileToUse, jobDescription, extractedJobSkills)
          break
        case 'education':
          result = await tailorEducation(profileToUse, jobDescription)
          break
        case 'skills':
          result = await tailorSkills(profileToUse, jobDescription, extractedJobSkills)
          break
        default:
          throw new Error('Unknown tailoring step')
      }

      // Update the step as completed with the result
      setTailoringSteps(prev => prev.map((s, i) =>
        i === stepIndex ? { ...s, completed: true, data: result } : s
      ))

      // Auto-advance to next step if not the last step
      if (stepIndex < tailoringSteps.length - 1) {
        setCurrentTailoringStep(stepIndex + 1)
      }

      toast({
        title: `${step.name} Completed`,
        description: `Step ${stepIndex + 1} of ${tailoringSteps.length} completed successfully.`,
      })

    } catch (error) {
      console.error(`Error in step ${stepIndex + 1}:`, error)
      toast({
        title: "Step Failed",
        description: `Failed to complete ${tailoringSteps[stepIndex].name}. Please try again.`,
        variant: "destructive"
      })
    } finally {
      setTailoringInProgress(false)
    }
  }

  // Generate the final tailored resume from all completed steps
  const generateFinalTailoredResume = () => {
    const allStepsCompleted = tailoringSteps.every(step => step.completed)

    if (!allStepsCompleted) {
      toast({
        title: "Incomplete Process",
        description: "Please complete all tailoring steps before generating the final resume.",
        variant: "destructive"
      })
      return
    }

    console.log('=== GENERATING FINAL TAILORED RESUME ===')
    console.log('Original resume profile:', resumeProfile)
    console.log('Tailoring steps data:', tailoringSteps)

    // Get tailored data from completed steps
    const summaryData = tailoringSteps.find(s => s.id === 'summary')?.data || ''
    const experienceData = tailoringSteps.find(s => s.id === 'experience')?.data || []
    const educationData = tailoringSteps.find(s => s.id === 'education')?.data || []
    const skillsData = tailoringSteps.find(s => s.id === 'skills')?.data || []

    console.log('Summary data:', summaryData)
    console.log('Experience data:', experienceData)
    console.log('Education data:', educationData)
    console.log('Skills data:', skillsData)

    // Build the tailored profile with proper data mapping
    const tailoredProfile = {
      personalInfo: {
        name: resumeProfile.personalInfo?.name || '',
        email: resumeProfile.personalInfo?.email || '',
        phone: resumeProfile.personalInfo?.phone || '',
        location: resumeProfile.personalInfo?.location || '',
        linkedin: resumeProfile.personalInfo?.linkedin || '',
        portfolio: resumeProfile.personalInfo?.portfolio || '',
        summary: summaryData || resumeProfile.personalInfo?.summary || ''
      },
      // Map experience data from AI format to internal format
      experiences: experienceData.map(exp => ({
        role: exp.job_title || '',
        company: exp.company || '',
        startDate: exp.start_date || '',
        endDate: exp.end_date || '',
        current: !exp.end_date,
        bullets: exp.key_achievements_responsibilities || [],
        skills: []
      })),
      // Map education data from AI format to internal format
      education: educationData.map(edu => ({
        school: edu.school_university || '',
        field: edu.field_of_study || '',
        degree: edu.degree || '',
        gpa: edu.gpa || '',
        startDate: edu.start_date || '',
        endDate: edu.end_date || ''
      })),
      // Extract skills from categories
      skills: skillsData.flatMap(cat => cat.items || []),
      projects: resumeProfile.projects || []
    }

    console.log('Final tailored profile:', tailoredProfile)

    // Generate formatted resume content
    const formattedResumeContent = generateResumeText(tailoredProfile)

      // Compute before/after skill gap analysis based on job skills
      let analysisBefore = null
      let analysisAfter = null
      let improvement = null
      try {
        const jobSkillsList = (extractedJobSkills && extractedJobSkills.length > 0) ? extractedJobSkills : []
        if (jobSkillsList.length > 0) {
          // Use the same extraction logic as Skill Gap Analysis for consistency
          const beforeSkills = extractResumeSkills()

          // Extract skills from the final rendered resume content for accuracy
          const afterExtractedFromContent = extractFromResume(formattedResumeContent)
          // Union with explicit tailored skills to avoid losing signal due to capping
          const explicitTailored = Array.isArray(tailoredProfile?.skills) ? tailoredProfile.skills : []
          const afterExtracted = Array.from(new Set([
            ...afterExtractedFromContent,
            ...explicitTailored
          ]))

          // Normalize to lowercase for consistent compareSkills behavior
          const normalizeArr = (arr) => Array.from(new Set((arr || []).map(s => (s || '').toString().toLowerCase().trim()))).filter(Boolean)
          const before = scoreSkills(jobSkillsList, normalizeArr(beforeSkills))
          const after = scoreSkills(jobSkillsList, normalizeArr(afterExtracted))
          analysisBefore = before
          analysisAfter = after
          improvement = Math.max(0, (after?.score?.value || 0) - (before?.score?.value || 0))
        }
      } catch (e) {
        console.warn('Failed to compute before/after skill analysis:', e)
      }

      // Store the tailored resume
      const newTailoredResume = {
        id: Date.now(),
        jobId: viewJob.id,
        jobTitle: viewJob.role,
        company: viewJob.company,
      content: formattedResumeContent,
      tailoredProfile: tailoredProfile,
      tailoringSteps: tailoringSteps,
        createdAt: new Date().toISOString(),
      originalResumeSkills: resumeProfile.skills || [],
        jobSkills: extractedJobSkills,
        analysisBefore,
        analysisAfter,
        improvement
      }

    console.log('Final tailored resume object:', newTailoredResume)

      setTailoredResume(newTailoredResume)
      // Persist defensively per-job as draft
      saveTailoredResumeForJob(viewJob.id, newTailoredResume)
      // Also persist on the job record and add a timeline entry (draft generated)
      if (viewJob) {
        persistJobMutation(viewJob.id, j => {
          j.tailoredResume = newTailoredResume
          j.history = [
            ...(j.history || []),
            { type: 'tailored', at: new Date().toISOString(), payload: { action: 'generated' } }
          ]
          return j
        })
      }
       
     // Save to job data for persistence
     const jobs = JSON.parse(localStorage.getItem('jobs') || '[]')
     const updatedJobs = jobs.map(job =>
       job.id === viewJob.id
         ? { ...job, tailoredResume: newTailoredResume }
         : job
     )
     localStorage.setItem('jobs', JSON.stringify(updatedJobs))

      toast({
      title: "Resume Tailored Successfully!",
      description: "Your resume has been fully customized for this job opportunity and saved.",
    })
  }

  // Reset tailoring process
  const resetTailoringProcess = () => {
    setCurrentTailoringStep(0)
    setTailoringSteps(prev => prev.map(step => ({ ...step, completed: false, data: null })))
    setTailoredResume(null)
  }

  // When opening Tailor Resume for a job, show previously saved tailored resume
  useEffect(() => {
    if (activeView !== 'tailor-resume') return
    if (!viewJob) {
      setTailoredResume(null)
      return
    }
    const tr = viewJob.tailoredResume || loadTailoredResumeForJob(viewJob.id)
    if (tr && (String(tr.jobId) === String(viewJob.id))) {
      setTailoredResume(tr)
    } else {
      // Clear any previously viewed resume so we don't leak across jobs
      setTailoredResume(null)
    }
  }, [activeView, viewJob])

  // Also keep tailored resume state in sync when switching jobs (regardless of active view)
  useEffect(() => {
    if (!viewJob) {
      setTailoredResume(null)
      return
    }
    const tr = viewJob.tailoredResume || loadTailoredResumeForJob(viewJob.id)
    if (tr && String(tr.jobId) === String(viewJob.id)) {
      setTailoredResume(tr)
    } else {
      setTailoredResume(null)
    }
  }, [viewJob])

  // Helpers to persist/load tailored resume per job (defensive persistence)
  const saveTailoredResumeForJob = (jobId, resumeObj) => {
    try {
      if (!jobId || !resumeObj) return
      localStorage.setItem(`openJobTailoredResume_${jobId}`, JSON.stringify(resumeObj))
    } catch {}
  }

  const loadTailoredResumeForJob = (jobId) => {
    try {
      if (!jobId) return null
      const raw = localStorage.getItem(`openJobTailoredResume_${jobId}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Tracker</h1>
          <p className="text-muted-foreground">Manage your job applications with a Kanban board</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Job
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                <span>Add Job</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                <span>Bulk Import</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV}>
                <Download className="h-4 w-4" />
                <span>Download Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddColumn}>
                <Columns className="h-4 w-4" />
                <span>Add Column</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleBulkImport} />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col">
              <DialogHeader className="shrink-0">
                <DialogTitle>Add New Job Application</DialogTitle>
                <DialogDescription>Track a new job opportunity (* = required fields)</DialogDescription>
              </DialogHeader>
              
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {/* Job URL Section */}
                <div className="space-y-4">
                  <div>
                    <Label>Job URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newJob.jobUrl}
                        onChange={(e) => setNewJob(prev => ({ ...prev, jobUrl: e.target.value }))}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      {aiProvider && aiModel && (
                        <Button type="button" variant="secondary" onClick={handleAutoFillFromUrl} disabled={isAutoFilling}>
                          {isAutoFilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                    {isAutoFilling && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Processing job posting... This may take a moment for longer descriptions.
                      </p>
                    )}
                  </div>

                  {/* Collapsible AI Configuration */}
                  <div className="border border-muted rounded-lg">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setShowAIConfig(!showAIConfig)}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        AI Auto-fill
                        {aiProvider && aiModel && (
                          <span className="text-xs text-green-600 ml-2">✓ Ready</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!showAIConfig && aiProvider && aiModel && (
                          <span className="text-xs text-muted-foreground">
                            {aiProvider} • {aiModel.split(':')[0] || aiModel.split('/').pop() || aiModel}
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 transition-transform ${showAIConfig ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    
                    {showAIConfig && (
                      <div className="border-t border-muted p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Provider Selection */}
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Provider</Label>
                            <ProviderSelector
                              selectedProvider={aiProvider}
                              onProviderChange={handleProviderChange}
                              title=""
                              description=""
                              showCard={false}
                              className="space-y-1"
                            />
                          </div>
                          
                          {/* Model Selection */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">Model</Label>
                              {aiProvider && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const savedSettings = localStorage.getItem('openJobSettings')
                                    if (savedSettings) {
                                      const settings = JSON.parse(savedSettings)
                                      const providerConfig = settings.providers[aiProvider]
                                      if (providerConfig) {
                                        loadAvailableModels(aiProvider, providerConfig)
                                      }
                                    }
                                  }}
                                  disabled={isLoadingModels}
                                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                                </Button>
                              )}
                            </div>
                            
                            <Select 
                              value={aiModel || ''} 
                              onValueChange={(value) => {
                                setAiModel(value)
                                const savedSettings = localStorage.getItem('openJobSettings')
                                if (savedSettings) {
                                  const settings = JSON.parse(savedSettings)
                                  if (settings.providers && settings.providers[aiProvider]) {
                                    settings.providers[aiProvider].model = value
                                    localStorage.setItem('openJobSettings', JSON.stringify(settings))
                                  }
                                }
                              }}
                              disabled={!aiProvider}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={!aiProvider ? "Select provider first" : isLoadingModels ? "Loading..." : "Select model"} />
                              </SelectTrigger>
                              <SelectContent>
                                {availableModels[aiProvider]?.slice().sort((a,b)=> (a.name||a.id).localeCompare(b.name||b.id)).map((model) => (
                                  <SelectItem key={model.id} value={model.id} className="text-xs">
                                    {model.name || model.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Status indicator */}
                        <div className="text-xs text-center pt-2 border-t border-muted">
                          {!aiProvider || !aiModel ? (
                            <span className="text-amber-600">Configure provider and model to enable auto-fill</span>
                          ) : (
                            <span className="text-green-600">✓ Configuration complete</span>
                          )}
                        </div>
                        
                        {/* Test Connection Button */}
                        {aiProvider && aiModel && (
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
                  </div>
                </div>

                {/* Mandatory Fields Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Required Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className={newJob.company ? "text-foreground" : "text-red-600"}>Company *</Label>
                      <Input
                        value={newJob.company}
                        onChange={(e) => setNewJob(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Company name"
                        className={!newJob.company ? "border-red-300 focus:border-red-500" : ""}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label className={newJob.role ? "text-foreground" : "text-red-600"}>Role *</Label>
                      <Input
                        value={newJob.role}
                        onChange={(e) => setNewJob(prev => ({ ...prev, role: e.target.value }))}
                        placeholder="Job title"
                        className={!newJob.role ? "border-red-300 focus:border-red-500" : ""}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label className={newJob.location ? "text-foreground" : "text-red-600"}>Location *</Label>
                      <Input
                        value={newJob.location}
                        onChange={(e) => setNewJob(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="City, State or Remote"
                        className={!newJob.location ? "border-red-300 focus:border-red-500" : ""}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label className={newJob.source ? "text-foreground" : "text-red-600"}>Source *</Label>
                      <Select 
                        value={newJob.source} 
                        onValueChange={(value) => setNewJob(prev => ({ ...prev, source: value }))}
                        required
                      >
                        <SelectTrigger className={!newJob.source ? "border-red-300 focus:border-red-500" : ""}>
                          <SelectValue placeholder="How did you find this job?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                          <SelectItem value="Indeed">Indeed</SelectItem>
                          <SelectItem value="Company Website">Company Website</SelectItem>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Recruiter">Recruiter</SelectItem>
                          <SelectItem value="Job Board">Job Board</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className={newJob.status ? "text-foreground" : "text-red-600"}>Status *</Label>
                      <Select 
                        value={newJob.status} 
                        onValueChange={(value) => setNewJob(prev => ({ ...prev, status: value }))}
                        required
                      >
                        <SelectTrigger className={!newJob.status ? "border-red-300 focus:border-red-500" : ""}>
                          <SelectValue placeholder="Application status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(status => (
                            <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className={newJob.jobDescription ? "text-foreground" : "text-red-600"}>Job Description *</Label>
                      <Textarea
                        value={newJob.jobDescription}
                        onChange={(e) => setNewJob(prev => ({ ...prev, jobDescription: e.target.value }))}
                        placeholder="Paste or summarize the job description..."
                        rows={8}
                        className={!newJob.jobDescription ? "border-red-300 focus:border-red-500 min-h-[200px]" : "min-h-[200px]"}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Fields Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Additional Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Salary Range</Label>
                      <Input
                        value={newJob.salary}
                        onChange={(e) => setNewJob(prev => ({ ...prev, salary: e.target.value }))}
                        placeholder="$80k - $100k"
                      />
                    </div>
                    
                    <div>
                      <Label>Deadline</Label>
                      <Input
                        type="date"
                        value={newJob.deadline}
                        onChange={(e) => setNewJob(prev => ({ ...prev, deadline: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label>Remarks</Label>
                      <Input
                        value={newJob.nextAction}
                        onChange={(e) => setNewJob(prev => ({ ...prev, nextAction: e.target.value }))}
                        placeholder="Any remarks or follow-ups..."
                      />
                    </div>
                    
                    <div>
                      <Label>Benefits</Label>
                      <div className="flex gap-2 items-start">
                        <Input
                          value={newBenefit}
                          onChange={(e) => setNewBenefit(e.target.value)}
                          placeholder="e.g. Health insurance"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const trimmed = newBenefit.trim()
                              if (!trimmed) return
                              setNewJob(prev => ({ ...prev, benefits: [...(prev.benefits || []), trimmed] }))
                              setNewBenefit('')
                            }
                          }}
                        />
                        <Button type="button" variant="outline" onClick={() => {
                          const trimmed = newBenefit.trim()
                          if (!trimmed) return
                          setNewJob(prev => ({ ...prev, benefits: [...(prev.benefits || []), trimmed] }))
                          setNewBenefit('')
                        }}>Add</Button>
                      </div>
                      {newJob.benefits && newJob.benefits.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {newJob.benefits.map((b, idx) => (
                            <span key={`${b}-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-muted">
                              {b}
                              <button type="button" onClick={() => setNewJob(prev => ({ ...prev, benefits: prev.benefits.filter((_, i) => i !== idx) }))}>
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Sticky Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t shrink-0">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={addJob}
                  disabled={!newJob.company || !newJob.role || !newJob.location || !newJob.source || !newJob.status || !newJob.jobDescription}
                >
                  Add Job
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map(status => (
              <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(280px, 1fr))` }}
        >
          {statuses.map(status => (
            <div key={status.id} className="space-y-3 rounded-lg bg-muted/30 p-3 border">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status.color}`} />
                <h3 className="font-semibold">{status.label}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {getJobsByStatus(status.id).length}
                </Badge>
                {!defaultStatuses.some(s => s.id === status.id) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRemoveColumn(status.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span>Remove Column</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              <div
                className={`space-y-3 min-h-[320px] rounded-md p-1 transition-colors ${dragOverStatus === status.id ? 'bg-muted/50 border-2 border-dashed border-ring' : ''}`}
                onDragOver={(e) => handleDragOver(e, status.id)}
                onDragLeave={() => setDragOverStatus(null)}
                onDrop={(e) => handleDrop(e, status.id)}
              >
                {getJobsByStatus(status.id).map(job => (
                  <Card
                    key={job.id}
                    className={`cursor-move hover:shadow-md transition-shadow border-l-4 ${getCardAccent(job)} ${draggingJobId === job.id ? 'opacity-70' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, job.id)}
                    onDragEnd={handleDragEnd}
                  onClick={() => {
                    setViewJob(job)
                    // Clear any carried tailored resume on job switch; it will reload if present
                    setTailoredResume(null)
                    // Load any existing skill analysis for this job
                    const savedAnalysis = loadSkillAnalysis(job.id)
                    if (savedAnalysis) {
                      setSkillAnalysis(savedAnalysis)
                      setExtractedJobSkills(savedAnalysis.extractedJobSkills || [])
                      setExtractedResumeSkills(savedAnalysis.resumeSkills || [])
                    } else {
                      // Clear previous analysis when opening a new job
                      setSkillAnalysis(null)
                      setExtractedJobSkills([])
                      setExtractedResumeSkills([])
                    }
                  }}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                      <div className="relative">
                        <h4 className="font-medium text-sm pr-8">{job.role}</h4>
                        <div className="absolute top-0 right-0 flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteJob(job.id) }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                      <p className="text-xs text-muted-foreground">{job.location}</p>
                      
                      {job.deadline && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {job.deadline}
                        </div>
                      )}
                      
                      {job.nextAction && (
                        <p className="text-xs bg-muted p-2 rounded">{job.nextAction}</p>
                      )}
                      
                      <div className="mt-2 text-[10px] text-muted-foreground">Drag card to another column to change status</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Enhanced View Job Dialog */}
      <Dialog open={!!viewJob} onOpenChange={(open) => { 
        if (!open) {
          setViewJob(null)
          // Clear skill analysis when closing job view
          setSkillAnalysis(null)
          setExtractedJobSkills([])
          setExtractedResumeSkills([])
        }
      }}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] h-[85vh] overflow-x-hidden p-0">
          {viewJob && (
            <div className="flex h-full min-h-0 flex-col">
              {/* Header: icon left; title above meta on right; actions on far right */}
              <div className="p-4 border-b">
                  <div className="text-sm font-semibold text-muted-foreground mb-1">Job details</div>
                  <div className="grid grid-cols-[auto_1fr_auto] grid-rows-[auto_auto] items-center gap-x-4 gap-y-1">
                    {/* Icon spanning both rows */}
                    <div className="row-span-2">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                        <Briefcase className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                    {/* Title to the right of icon */}
                    <h1 className="text-2xl font-bold leading-tight truncate col-start-2 row-start-1">{viewJob.role}</h1>
                    {/* Meta under title to the right of icon */}
                    <div className="col-start-2 row-start-2 flex items-center gap-3 min-w-0 text-muted-foreground">
                      <span className="flex items-center gap-1 min-w-0 max-w-[22ch] truncate"><Building className="h-4 w-4" />{viewJob.company}</span>
                      <span className="flex items-center gap-1 min-w-0 max-w-[22ch] truncate"><MapPin className="h-4 w-4" />{viewJob.location || 'Location Not Specified'}</span>
                      <span className="flex items-center gap-1 min-w-0 max-w-[22ch] truncate"><DollarSign className="h-4 w-4" />{viewJob.salary || 'Salary: Not specified'}</span>
                    </div>
                    {/* Actions pinned right (centered vertically across header) */}
                    <div className="col-start-3 row-span-2 self-center flex items-center justify-end gap-2 shrink-0">
                      {viewJob.jobUrl && (
                        <Button variant="outline" onClick={() => window.open(viewJob.jobUrl, '_blank')} title="View Job Link">
                          <Globe className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => { deleteJob(viewJob.id); setViewJob(null) }} title="Delete Job">
                        <Trash2 className="h-4 w-4" />
                        </Button>
                      <Button variant="outline" onClick={() => { setEditingJob(viewJob); setViewJob(null) }} title="Edit Job">
                        <SquarePen className="h-4 w-4" />
                      </Button>
                      <Select value={viewJob.status} onValueChange={(val) => updateJobStatus(viewJob.id, val)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(status => (
                            <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Removed 'Added manually on ...' meta line per request */}
              </div>

              {/* Content row: sidebar + main details + timeline */}
              <div className="flex min-h-0 flex-1">
                {/* Sidebar Navigation (moved below header to align with content) */}
                <div className="w-64 bg-muted/30 border-r p-4 space-y-2 overflow-y-auto">
                  <nav className="space-y-1">
                    {[
                      { id: 'overview', label: 'Overview', icon: FileText },
                      { id: 'skill-gap', label: 'Skill Gap Analysis', icon: Gauge },
                      { id: 'tailor-resume', label: 'Tailor Resume', icon: FileEdit },
                      { id: 'mock-interview', label: 'Mock Interview', icon: MessageCircle },
                      { id: 'network', label: 'Network', icon: Users },
                      { id: 'notes', label: 'Notes', icon: StickyNote },
                      { id: 'contacts', label: 'Contacts', icon: Contact },
                      { id: 'documents', label: 'Documents', icon: Folder },
                      { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                    ].map(item => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className={`w-full justify-start ${activeView === item.id ? 'bg-blue-50 text-blue-700' : ''}`}
                        onClick={() => setActiveView(item.id)}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    ))}
                  </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 overflow-y-auto min-h-0">

                  {/* Section Content */}
                  {activeView === 'overview' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Description</h2>
                        {(() => {
                          const jobDesc = (typeof viewJob.jobDescription === 'string' && viewJob.jobDescription.trim())
                            ? viewJob.jobDescription
                            : (typeof viewJob.notes === 'string' ? viewJob.notes : '')
                          return jobDesc ? (
                            <div className="space-y-4">
                              <div>
                                <h3 className="font-medium mb-2">About the job</h3>
                                <div className="prose prose-sm max-w-none">
                                  <div 
                                    className="text-sm leading-relaxed space-y-3 [&>ul]:my-3 [&>ul>li]:mb-1 [&>strong]:font-semibold [&>em]:italic [&>br]:mb-2"
                                    dangerouslySetInnerHTML={{ __html: markdownToHtml(jobDesc) }}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>No job description available</p>
                              <p className="text-sm">Add a description to better track this opportunity</p>
                            </div>
                          )
                        })()}
                      </div>

                       {(viewJob.nextAction) && (
                        <div className="space-y-4">
                          {viewJob.nextAction && (
                            <div>
                              <h3 className="font-medium mb-2">Next Action</h3>
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm">{viewJob.nextAction}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeView === 'notes' && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input value={noteDraft} onChange={(e)=>setNoteDraft(e.target.value)} placeholder="Add a note..." />
                        <Button onClick={addNote}>Add</Button>
                      </div>
                      <div className="space-y-2 max-h-[50vh] overflow-auto">
                        {(Array.isArray(viewJob.notes) ? viewJob.notes : []).slice().reverse().map(n => (
                          <div key={n.id} className="border rounded p-2 text-sm">
                            <div className="text-muted-foreground text-xs mb-1">{formatDistanceToNow(new Date(n.at), { addSuffix: true })}</div>
                            <div className="whitespace-pre-wrap">{n.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeView === 'tasks' && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input value={taskDraft} onChange={(e)=>setTaskDraft(e.target.value)} placeholder="Follow-up, schedule call, prepare take-home..." />
                        <Input type="date" className="w-40" value={taskDueDraft} onChange={(e)=>setTaskDueDraft(e.target.value)} />
                        <Button onClick={addTask}><CheckSquare className="h-4 w-4 mr-2"/>Add</Button>
                      </div>
                      <div className="space-y-2 max-h-[50vh] overflow-auto">
                        {(viewJob.tasks||[]).map(t => (
                          <div key={t.id} className="flex items-center gap-2 border rounded p-2 text-sm">
                            <input type="checkbox" checked={!!t.done} onChange={()=>toggleTask(t.id)} />
                            <div className={`flex-1 ${t.done ? 'line-through text-muted-foreground' : ''}`}>{t.title}</div>
                            {t.due && <div className="text-xs text-muted-foreground">Due {t.due}</div>}
                            <Button size="sm" variant="ghost" onClick={()=>deleteTask(t.id)}><Trash2 className="h-4 w-4"/></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeView === 'skill-gap' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Skills</h2>
                        <div className="flex gap-2">
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => handleExtractSkills(false)} 
                              disabled={isExtractingSkills}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              {isExtractingSkills ? 'Analyzing…' : 'Analyze Skills (Fast)'}
                            </Button>
                            
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" disabled={isExtractingSkills}>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  AI Enhanced Analysis
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium">AI Provider</h4>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => loadModelsForProvider(skillExtractionProvider)}
                                      >
                                        <RefreshCw className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <Select 
                                      value={skillExtractionProvider} 
                                      onValueChange={(value) => {
                                        setSkillExtractionProvider(value)
                                        setSkillExtractionModel('')
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select provider" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="openai">OpenAI</SelectItem>
                                        <SelectItem value="gemini">Google Gemini</SelectItem>
                                        <SelectItem value="ollama">Ollama</SelectItem>
                                        <SelectItem value="maritaca">Maritaca</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <h4 className="font-medium">Model</h4>
                                    <Select 
                                      value={skillExtractionModel} 
                                      onValueChange={setSkillExtractionModel}
                                      disabled={skillExtractionModels.length === 0}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select model" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {skillExtractionModels.map(model => (
                                          <SelectItem key={model.id} value={model.id}>
                                            {model.name || model.id}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {skillExtractionModels.length === 0 && (
                                      <p className="text-xs text-muted-foreground">
                                        No models available. Check provider configuration.
                                      </p>
                                    )}
                                  </div>
                                  
                                  <Button 
                                    onClick={() => handleExtractSkills(true, skillExtractionProvider, skillExtractionModel)}
                                    disabled={!skillExtractionModel || isExtractingSkills}
                                    className="w-full"
                                  >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Analyze with AI
                                  </Button>
                                  
                                  {/* Troubleshooting help for Ollama */}
                                  {skillExtractionProvider === 'ollama' && (
                                    <div className="mt-4 p-3 bg-muted rounded-lg">
                                      <h5 className="font-medium text-sm mb-2">Ollama Troubleshooting</h5>
                                      <div className="text-xs text-muted-foreground space-y-1">
                                        <p>• Make sure Ollama is running: <code className="bg-background px-1 rounded">ollama serve</code></p>
                                        <p>• Default host: <code className="bg-background px-1 rounded">http://localhost:11434</code></p>
                                        <p>• Check if model is downloaded: <code className="bg-background px-1 rounded">ollama list</code></p>
                                        <p>• Download model: <code className="bg-background px-1 rounded">ollama pull {skillExtractionModel}</code></p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          
                          
                          <Button variant="outline" onClick={refreshSkillsFromProfile} disabled={isScoring}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Skills
                          </Button>
                          <Button variant="outline" onClick={() => {
                            clearAllSkillAnalysis()
                            setSkillAnalysis(null)
                            setExtractedJobSkills([])
                            setExtractedResumeSkills([])
                            toast({
                              title: "Skills Cleared",
                              description: "All skill analysis data has been cleared.",
                              duration: 2000,
                            })
                          }}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Skills
                          </Button>


                        </div>
                      </div>

                      {/* Score Card */}
                      <div className="rounded-xl border p-4 md:p-6 flex items-center gap-6 bg-card">
                        <div className="relative w-20 h-20">
                          {isScoring ? (
                            <Skeleton className="w-20 h-20 rounded-full" />
                          ) : (
                            <svg viewBox="0 0 36 36" className="w-20 h-20">
                              {/* Background circle - unmatched portion */}
                              <path stroke="#f0f0f0" strokeWidth="3" fill="none" d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32" />
                              {/* Progress circle - matched portion */}
                              <path className={skillAnalysis?.score?.band === 'high' ? 'text-green-500' : skillAnalysis?.score?.band === 'medium' ? 'text-yellow-500' : 'text-red-500'} stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32" strokeDasharray={`${(skillAnalysis?.score?.value||0)}, 100`} transform="rotate(-90 18 18)" />
                              <text x="18" y="20" textAnchor="middle" className="fill-foreground text-xs">{skillAnalysis?.score?.value ?? 0}%</text>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">Skill Score</div>
                          <div className="text-sm text-muted-foreground">Based on the job description and your resume.</div>
                          {!(extractedJobSkills.length > 0 && (extractedResumeSkills.length > 0 || (resumeProfile?.skills?.length > 0))) && (
                            <div className="text-xs text-muted-foreground mt-1">Extract skills first to enable comparison.</div>
                          )}
                        </div>
                        <div className="ml-auto">
                          <Button
                            onClick={() => { setActiveView('tailor-resume'); resetTailoringProcess() }}
                            disabled={!aiProvider || !aiModel}
                            title="Tailor your master résumé to this job"
                          >
                            <FileEdit className="h-4 w-4 mr-2" />
                            Tailor Resume
                          </Button>
                        </div>
                      </div>

                      {/* Skill Categories - Always visible */}
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-green-600 font-semibold">Strong Match</div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                                  <Info className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Strong Match</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Skills that exactly match between the job description and your resume. These are your strongest qualifications for the position.
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {skillAnalysis?.buckets?.strong?.length > 0 ? (
                              [...skillAnalysis.buckets.strong]
                                .sort((a, b) => a.skill.localeCompare(b.skill))
                                .map((m, i) => (
                                <Popover key={`s-${i}`}>
                                  <PopoverTrigger asChild>
                                    <button 
                                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-all duration-300 ${
                                        recentlyAddedSkills.has(m.skill) 
                                          ? 'bg-green-100 text-green-800 ring-2 ring-green-300 scale-105' 
                                          : recentlyIgnoredSkills.has(m.skill)
                                          ? 'bg-red-100 text-red-800 ring-2 ring-red-300 scale-95 opacity-50'
                                          : 'bg-muted hover:bg-muted/70'
                                      }`}
                                    >
                                      {m.skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="text-xs">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="font-medium">{m.skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</div>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => openGoogleSearch(m.skill)}
                                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                                          title="Google search"
                                        >
                                          <Search className="h-3 w-3 text-blue-600" />
                                        </button>
                                        <button 
                                          onClick={() => ignoreSkill(m.skill)}
                                          className="p-1 hover:bg-red-100 rounded transition-colors"
                                          title="Ignore skill"
                                        >
                                          <Delete className="h-3 w-3 text-red-600" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-muted-foreground mb-2">Confident match · {Math.round((m.confidence||0)*100)}%</div>
                                  </PopoverContent>
                                </Popover>
                              ))
                            ) : (
                              <div className="text-xs text-muted-foreground">No strong matches yet</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-yellow-600 font-semibold">Partial Match</div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                                  <Info className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Partial Match</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Skills that have fuzzy or partial matches with your resume. These show related experience but may not be exact matches.
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {skillAnalysis?.buckets?.partial?.length > 0 ? (
                              [...skillAnalysis.buckets.partial]
                                .sort((a, b) => a.skill.localeCompare(b.skill))
                                .map((m, i) => (
                                <Popover key={`p-${i}`}>
                                  <PopoverTrigger asChild>
                                    <button 
                                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-all duration-300 ${
                                        recentlyAddedSkills.has(m.skill) 
                                          ? 'bg-green-100 text-green-800 ring-2 ring-green-300 scale-105' 
                                          : recentlyIgnoredSkills.has(m.skill)
                                          ? 'bg-red-100 text-red-800 ring-2 ring-red-300 scale-95 opacity-50'
                                          : 'bg-muted hover:bg-muted/70'
                                      }`}
                                    >
                                      {m.skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="text-xs">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="font-medium">{m.skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</div>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => addSkillToResume(m.skill)}
                                          className="p-1 hover:bg-green-100 rounded transition-colors"
                                          title="Add to resume"
                                        >
                                          <FilePlus2 className="h-3 w-3 text-green-600" />
                                        </button>
                                        <button 
                                          onClick={() => openGoogleSearch(m.skill)}
                                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                                          title="Google search"
                                        >
                                          <Search className="h-3 w-3 text-blue-600" />
                                        </button>
                                        <button 
                                          onClick={() => ignoreSkill(m.skill)}
                                          className="p-1 hover:bg-red-100 rounded transition-colors"
                                          title="Ignore skill"
                                        >
                                          <Delete className="h-3 w-3 text-red-600" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-muted-foreground mb-2">Related match · {Math.round((m.confidence||0)*100)}%</div>
                                    {m.partialMatches && Array.isArray(m.partialMatches) && m.partialMatches.length > 0 && (
                                      <div className="text-xs text-muted-foreground mb-3">
                                        <div className="font-medium mb-1">Matched with:</div>
                                        <div className="flex flex-wrap gap-1">
                                          {m.partialMatches.map((match, idx) => (
                                            <span key={idx} className="inline-block px-2 py-1 text-xs rounded-full" style={{ backgroundColor: '#d18904', color: 'white' }}>
                                              {match.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </PopoverContent>
                                </Popover>
                              ))
                            ) : (
                              <div className="text-xs text-muted-foreground">No partial matches yet</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-red-600 font-semibold">Missing Keywords</div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                                  <Info className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Missing Keywords</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Skills required by the job that are not found in your resume. These represent opportunities to improve your qualifications.
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {skillAnalysis?.buckets?.missing?.length > 0 ? (
                              [...skillAnalysis.buckets.missing]
                                .sort((a, b) => a.skill.localeCompare(b.skill))
                                .map((m, i) => (
                                <Popover key={`m-${i}`}>
                                  <PopoverTrigger asChild>
                                    <button 
                                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-all duration-300 ${
                                        recentlyAddedSkills.has(m.skill) 
                                          ? 'bg-green-100 text-green-800 ring-2 ring-green-300 scale-105' 
                                          : recentlyIgnoredSkills.has(m.skill)
                                          ? 'bg-red-100 text-red-800 ring-2 ring-red-300 scale-95 opacity-50'
                                          : 'bg-muted hover:bg-muted/70'
                                      }`}
                                    >
                                      {m.skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="text-xs">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="font-medium">{m.skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</div>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => addSkillToResume(m.skill)}
                                          className="p-1 hover:bg-green-100 rounded transition-colors"
                                          title="Add to resume"
                                        >
                                          <FilePlus2 className="h-3 w-3 text-green-600" />
                                        </button>
                                        <button 
                                          onClick={() => openGoogleSearch(m.skill)}
                                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                                          title="Google search"
                                        >
                                          <Search className="h-3 w-3 text-blue-600" />
                                        </button>
                                        <button 
                                          onClick={() => ignoreSkill(m.skill)}
                                          className="p-1 hover:bg-red-100 rounded transition-colors"
                                          title="Ignore skill"
                                        >
                                          <Delete className="h-3 w-3 text-red-600" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-muted-foreground">Not found in resume</div>
                                  </PopoverContent>
                                </Popover>
                              ))
                            ) : (
                              <div className="text-xs text-muted-foreground">No missing keywords yet</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Extracted Skills Display */}
                      {(extractedJobSkills.length > 0 || extractedResumeSkills.length > 0) && (
                        <div className="space-y-4">
                          {extractedJobSkills.length > 0 && (
                            <div className="rounded-lg border p-4">
                              <h3 className="font-medium mb-3">Extracted Job Skills ({extractedJobSkills.length})</h3>
                              <div className="flex flex-wrap gap-2">
                                {[...extractedJobSkills]
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map((skill, index) => (
                                  <span key={index} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                    {skill.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    {skill.critical && <span className="text-red-600">★</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {extractedResumeSkills.length > 0 && (
                            <div className="rounded-lg border p-4">
                              <h3 className="font-medium mb-3">Extracted Resume Skills ({extractedResumeSkills.length})</h3>
                              <div className="flex flex-wrap gap-2">
                                {[...extractedResumeSkills]
                                  .sort((a, b) => a.localeCompare(b))
                                  .map((skill, index) => (
                                  <span key={index} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                    {skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Empty states and prompts */}
                      {(!resumeProfile?.skills?.length || !(viewJob.jobDescription || viewJob.notes)) && (
                        <div className="rounded-lg border p-4 text-sm flex items-center justify-between">
                          <div className="text-muted-foreground">{!resumeProfile?.skills?.length ? 'No resume skills found. Add skills to your resume.' : 'No job description text available to extract skills.'}</div>
                          <div className="flex gap-2">
                            {!resumeProfile?.skills?.length && (
                              <Button asChild variant="secondary"><Link to="/profile">Add skills to resume</Link></Button>
                            )}
                            {!(viewJob.jobDescription || viewJob.notes) && (
                              <Button variant="outline" disabled>Extract Skills</Button>
                            )}
                          </div>
                        </div>
                      )}


                    </div>
                  )}

                  {activeView === 'tailor-resume' && (
                    <div className="space-y-6">
                      {!tailoredResume ? (
                        <>
                          <div className="text-center py-8">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                              <Sparkles className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step-by-Step Resume Tailoring</h2>
                            <p className="text-gray-600 mb-4 max-w-md mx-auto">
                              Customize your resume for this specific job opportunity through focused steps
                            </p>
                          </div>

                          {/* Step Progress */}
                          <div className="max-w-4xl mx-auto">
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-4">
                                {tailoringSteps.map((step, index) => (
                                  <div key={step.id} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                      step.completed
                                        ? 'bg-green-500 text-white'
                                        : index === currentTailoringStep
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-300 text-gray-600'
                                    }`}>
                                      {step.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
                                    </div>
                                    {index < tailoringSteps.length - 1 && (
                                      <div className={`w-16 h-0.5 mx-2 ${
                                        step.completed ? 'bg-green-500' : 'bg-gray-300'
                                      }`} />
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between text-sm text-gray-600">
                                {tailoringSteps.map((step) => (
                                  <span key={step.id} className="text-center min-w-0 flex-1">
                                    {step.name}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Current Step Content */}
                            <div className="bg-white border rounded-lg p-6 mb-6">
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold mb-2">
                                  Step {currentTailoringStep + 1}: {tailoringSteps[currentTailoringStep]?.name}
                                </h3>
                                <p className="text-gray-600 text-sm">
                                  {tailoringSteps[currentTailoringStep]?.id === 'summary' && 'Revamp your professional summary to highlight relevant qualifications and achievements for this job.'}
                                  {tailoringSteps[currentTailoringStep]?.id === 'experience' && 'Select and tailor your most relevant work experience to match the job requirements.'}
                                  {tailoringSteps[currentTailoringStep]?.id === 'education' && 'Present your education in the most compelling way for this role.'}
                                  {tailoringSteps[currentTailoringStep]?.id === 'skills' && 'Curate the most relevant skills that match the job description.'}
                                </p>
                              </div>

                              {/* Step Preview */}
                              {tailoringSteps[currentTailoringStep]?.completed && (
                                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                  <h4 className="font-medium mb-2">Preview:</h4>
                                  <div className="text-sm text-gray-700">
                                    {tailoringSteps[currentTailoringStep]?.id === 'summary' && (
                                      <p className="italic">"{tailoringSteps[currentTailoringStep]?.data}"</p>
                                    )}
                                    {tailoringSteps[currentTailoringStep]?.id === 'experience' && (
                                      <div>
                                        <p className="font-medium mb-1">Selected {tailoringSteps[currentTailoringStep]?.data?.length || 0} relevant experiences</p>
                                        {tailoringSteps[currentTailoringStep]?.data?.slice(0, 2).map((exp, i) => (
                                          <p key={i} className="text-xs text-gray-600 ml-2">• {exp.job_title} at {exp.company}</p>
                                        ))}
                                      </div>
                                    )}
                                    {tailoringSteps[currentTailoringStep]?.id === 'education' && (
                                      <p>Education section prepared with {tailoringSteps[currentTailoringStep]?.data?.length || 0} entries</p>
                                    )}
                                    {tailoringSteps[currentTailoringStep]?.id === 'skills' && (
                                      <div>
                                        <p className="font-medium mb-1">Selected skills:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {tailoringSteps[currentTailoringStep]?.data?.flatMap(cat => cat.items)?.slice(0, 5).map((skill, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-3">
                                <Button
                                  onClick={() => executeTailoringStep(currentTailoringStep)}
                                  disabled={tailoringInProgress}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {tailoringInProgress ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : tailoringSteps[currentTailoringStep]?.completed ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Re-run Step
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-4 w-4 mr-2" />
                                      Run Step {currentTailoringStep + 1}
                                    </>
                                  )}
                                </Button>

                                {tailoringSteps.every(step => step.completed) && (
                                  <Button
                                    onClick={generateFinalTailoredResume}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Generate Final Resume
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  onClick={resetTailoringProcess}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Reset All
                                </Button>
                              </div>
                            </div>

                            {/* AI Configuration */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-gray-900">AI Configuration</h3>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={loadAvailableProviders}
                                disabled={isLoadingModels}
                                className="h-8 px-2"
                              >
                                {isLoadingModels ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            
                            {isLoadingModels ? (
                              <div className="text-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-500" />
                                <p className="text-sm text-gray-600">Testing AI provider connections...</p>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="ai-provider" className="text-sm font-medium text-gray-700">Provider</Label>
                                    <Select value={aiProvider} onValueChange={setAiProvider}>
                                      <SelectTrigger id="ai-provider" className="w-full">
                                        <SelectValue placeholder="Select AI Provider" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(providerStatus).map(([provider, isAvailable]) => (
                                          <SelectItem 
                                            key={provider} 
                                            value={provider}
                                            disabled={!isAvailable}
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                              {provider === 'openai' && 'OpenAI (GPT)'}
                                              {provider === 'gemini' && 'Google Gemini'}
                                              {provider === 'ollama' && 'Ollama (Local)'}
                                              {provider === 'custom' && 'Custom API'}
                                            </div>
                                          </SelectItem>
                                        ))}
                                        
                                        {Object.values(providerStatus).every(status => !status) && (
                                          <SelectItem value="" disabled>
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                              No providers available
                                            </div>
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="ai-model" className="text-sm font-medium text-gray-700">Model</Label>
                                    <Select value={aiModel} onValueChange={setAiModel} disabled={!aiProvider || !availableModels[aiProvider]}>
                                      <SelectTrigger id="ai-model" className="w-full">
                                        <SelectValue placeholder={aiProvider ? "Select Model" : "Select Provider First"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {aiProvider && availableModels[aiProvider] && availableModels[aiProvider].map((model) => (
                                          <SelectItem key={model.id || model.name} value={model.id || model.name}>
                                            <span>{model.name || model.id}</span>
                                          </SelectItem>
                                        ))}
                                        
                                        {aiProvider && (!availableModels[aiProvider] || availableModels[aiProvider].length === 0) && (
                                          <SelectItem value="" disabled>
                                            No models available
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                  {/* Provider Status */}
                                {aiProvider && providerStatus[aiProvider] && availableModels[aiProvider] && (
                                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                                    <Info className="h-4 w-4 inline mr-1" />
                                      Ready to tailor resume with {aiProvider === 'ollama' ? 'Ollama' :
                                     aiProvider === 'openai' ? 'OpenAI' :
                                     aiProvider === 'gemini' ? 'Google Gemini' :
                                       aiProvider === 'custom' ? 'Custom Provider' : aiProvider}
                                  </div>
                                )}
                              {/* AI Experience Tailoring is mandatory; toggle removed */}
                              </>
                            )}
                        </div>

                            {/* Job Overview */}
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                                <FileText className="h-5 w-5 mr-2" />
                                  Your Resume
                              </h3>
                              <p className="text-blue-700 text-sm mb-4">
                                  We'll tailor your existing resume content to match this job opportunity.
                              </p>
                              <div className="text-xs text-blue-600">
                                  Skills: {resumeProfile?.skills?.length || 0} •
                                  Experience: {resumeProfile?.experiences?.length || 0} entries •
                                  Education: {resumeProfile?.education?.length || 0} entries
                              </div>
                            </div>
                            
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                              <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                                <Building className="h-5 w-5 mr-2" />
                                  Job Target
                              </h3>
                              <p className="text-purple-700 text-sm mb-4">
                                  {viewJob.role} at {viewJob.company}
                              </p>
                              <div className="text-xs text-purple-600">
                                  {viewJob.jobDescription ? 'Job description available' : 'No job description'} •
                                  Skills matched: {extractedJobSkills?.length || 0}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Your Tailored Resume</h2>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                onClick={() => setTailoredResume(null)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Generate New
                              </Button>
                              <Button 
                                onClick={() => {
                                  const markdown = normalizeToMarkdown(tailoredResume.content)
                                  const blob = new Blob([markdown], { type: 'text/markdown' })
                                  const url = URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `tailored-resume-${viewJob.company}-${viewJob.role}.md`
                                  a.click()
                                  URL.revokeObjectURL(url)
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              <Button
                                onClick={() => {
                                  // Save the tailored resume to Document Vault
                                  const documentVault = JSON.parse(localStorage.getItem('openJobDocuments') || '[]')
                                  const newDocument = {
                                    id: Date.now(),
                                    name: `Tailored Resume - ${tailoredResume.jobTitle} at ${tailoredResume.company}`,
                                    type: 'resume',
                                    content: tailoredResume.content,
                                    jobId: tailoredResume.jobId,
                                    jobTitle: tailoredResume.jobTitle,
                                    company: tailoredResume.company,
                                    dateCreated: new Date().toISOString().split('T')[0],
                                    dateModified: new Date().toISOString().split('T')[0],
                                    version: '1.0',
                                    size: `${(new Blob([tailoredResume.content]).size / 1024).toFixed(1)} KB`,
                                    description: '',
                                    tags: ['tailored', 'resume', tailoredResume.company, tailoredResume.jobTitle]
                                  }

                                  documentVault.push(newDocument)
                                  localStorage.setItem('openJobDocuments', JSON.stringify(documentVault))

                                  toast({
                                    title: "Resume Saved!",
                                    description: "Your tailored resume has been saved to the Document Vault.",
                                  })
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve & Save to Vault
                              </Button>
                            </div>
                          </div>
                          
                          <div className="bg-white border rounded-lg p-6">
                            <div className="mb-4 p-3 bg-gray-50 rounded border">
                              <h3 className="font-semibold text-gray-900 mb-2">Resume Details</h3>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Job Title:</span> {tailoredResume.jobTitle}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Company:</span> {tailoredResume.company}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Generated:</span> {new Date(tailoredResume.createdAt).toLocaleDateString()}
                                </div>
                                {tailoredResume?.analysisBefore && tailoredResume?.analysisAfter ? (
                                  <div className="col-span-2 grid grid-cols-3 gap-4 items-center">
                                    <div className="text-sm">
                                      <div className="font-medium text-gray-700">Skill Match (Before)</div>
                                      <div className="text-gray-900 text-lg">{tailoredResume.analysisBefore.score.value}%</div>
                                    </div>
                                    <div className="text-sm">
                                      <div className="font-medium text-gray-700">Skill Match (After)</div>
                                      <div className="text-gray-900 text-lg">{tailoredResume.analysisAfter.score.value}%</div>
                                    </div>
                                    <div className="text-sm">
                                      <div className="font-medium text-gray-700">Improvement</div>
                                      <div className="text-gray-900 text-lg">+{Math.max(0, (tailoredResume.improvement || 0))}%</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-medium text-gray-700">Skills Matched:</span> {tailoredResume.originalResumeSkills.length}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              {/* Resume Content */}
                              <div className="bg-white border rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-3">Tailored Resume</h4>
                                <div className="overflow-auto max-h-96">
                                  {tailoredResume.tailoredProfile ? (
                                    <MasterResumeLayout profile={tailoredResume.tailoredProfile} />
                                  ) : (
                                <div className="prose max-w-none">
                                  <div className="bg-white p-8 rounded border overflow-auto max-h-96 font-sans text-gray-900">
                                    {tailoredResume.content.split('EXPLANATION OF CHANGES')[0].split('\n').map((line, index) => {
                                      const trimmedLine = line.trim()
                                      
                                      // Skip empty lines
                                      if (!trimmedLine) {
                                        return <div key={index} className="h-4"></div>
                                      }
                                      
                                      // Skip the Master Resume header and subtitle - not needed for tailored resume
                                      if (trimmedLine === '**Master Résumé**' || trimmedLine === 'A compiled, neatly formatted view of your information.') {
                                        return null
                                      }
                                      
                                      // Name (large, bold, centered, exact match)
                                      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && !trimmedLine.includes('**Master Résumé**')) {
                                        const name = trimmedLine.replace(/\*\*/g, '')
                                        if (name.length > 3 && !name.includes('Summary') && !name.includes('Experience') && !name.includes('Skills') && !name.includes('Education') && !name.includes('Projects')) {
                                          return <h2 key={index} className="text-3xl font-bold text-gray-900 text-center mb-6">{name}</h2>
                                        }
                                      }
                                      
                                      // Contact information (centered, exact match)
                                      if (trimmedLine.includes('@') && trimmedLine.includes('•')) {
                                        return <p key={index} className="text-gray-600 text-center mb-8 text-lg">{trimmedLine}</p>
                                      }
                                      
                                      // Section headers (bold, large, with proper spacing, exact match)
                                      if (trimmedLine === '**Summary**' || trimmedLine === '**Experience**' || trimmedLine === '**Skills**' || trimmedLine === '**Education**' || trimmedLine === '**Projects**') {
                                        return <h3 key={index} className="text-2xl font-bold text-gray-900 mb-6 mt-8">{trimmedLine.replace(/\*\*/g, '')}</h3>
                                      }
                                      
                                      // Job titles with dates (bold title, right-aligned dates, exact match)
                                      if (trimmedLine.includes(' at ') && trimmedLine.includes(' - ')) {
                                        const [titleCompany, dates] = trimmedLine.split(' - ')
                                        return (
                                          <div key={index} className="flex justify-between items-start mb-4">
                                            <span className="font-bold text-gray-900 text-xl">{titleCompany}</span>
                                            <span className="text-gray-600 text-base font-medium">{dates}</span>
                                          </div>
                                        )
                                      }
                                      
                                      // Bullet points (proper indentation and spacing, exact match)
                                      if (trimmedLine.startsWith('•')) {
                                        return <p key={index} className="ml-8 mb-3 text-gray-700 leading-relaxed text-lg">{trimmedLine}</p>
                                      }
                                      
                                      // Education entries with dates (exact match)
                                      if (trimmedLine.includes(' in ') && trimmedLine.includes(' from ') && trimmedLine.includes(' - ')) {
                                        const [degreeField, rest] = trimmedLine.split(' from ')
                                        const [school, dates] = rest.split(' - ')
                                        return (
                                          <div key={index} className="flex justify-between items-start mb-4">
                                            <span className="font-bold text-gray-900 text-xl">{degreeField}</span>
                                            <span className="text-gray-600 text-base font-medium">{dates}</span>
                                          </div>
                                        )
                                      }
                                      
                                      // University name (indented under education)
                                      if (trimmedLine.includes('University') || trimmedLine.includes('College') || trimmedLine.includes('School')) {
                                        return <p key={index} className="ml-8 mb-2 text-gray-700 text-lg">{trimmedLine}</p>
                                      }
                                      
                                      // GPA (indented under education)
                                      if (trimmedLine.includes('GPA:')) {
                                        return <p key={index} className="ml-8 mb-4 text-gray-700 text-lg">{trimmedLine}</p>
                                      }
                                      
                                      // Project titles (exact match)
                                      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.includes('Project')) {
                                        return <h4 key={index} className="font-bold text-gray-900 mb-3 mt-6 text-xl">{trimmedLine.replace(/\*\*/g, '')}</h4>
                                      }
                                      
                                      // Regular paragraphs (like summary, exact match)
                                      if (trimmedLine.length > 50 && !trimmedLine.startsWith('**') && !trimmedLine.startsWith('•') && !trimmedLine.includes('University') && !trimmedLine.includes('GPA:')) {
                                        return <p key={index} className="text-gray-700 mb-6 leading-relaxed text-lg">{trimmedLine}</p>
                                      }
                                      
                                      // Default case for other text
                                      return <p key={index} className="text-gray-700 mb-2 text-lg">{trimmedLine}</p>
                                    })}
                                  </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Explanation of Changes */}
                              {tailoredResume.content.includes('EXPLANATION OF CHANGES') && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <h4 className="font-semibold text-blue-900 mb-3">Explanation of Changes</h4>
                                  <div className="prose max-w-none">
                                    <div className="bg-white p-4 rounded border overflow-auto max-h-64">
                                      {tailoredResume.content.split('EXPLANATION OF CHANGES')[1].split('\n').map((line, index) => {
                                        if (line.startsWith('**') && line.endsWith('**')) {
                                          return <h4 key={index} className="font-bold text-blue-900 mb-2">{line.replace(/\*\*/g, '')}</h4>
                                        } else if (line.startsWith('•')) {
                                          return <div key={index} className="ml-4 mb-1 text-blue-700">• {line.substring(1).trim()}</div>
                                        } else if (line.trim() === '') {
                                          return <div key={index} className="mb-2"></div>
                                        } else {
                                          return <div key={index} className="text-blue-700 mb-2">{line}</div>
                                        }
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="w-80 border-l p-6 overflow-y-auto bg-muted/20 min-h-0">
                  <h2 className="text-lg font-semibold mb-4">Timeline</h2>
                  <div className="space-y-3">
                    {((viewJob.history)||[]).slice().reverse().map((h, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${h.type === 'status' ? 'bg-blue-500' : h.type === 'task' ? 'bg-green-500' : h.type === 'tailored' ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {h.type === 'status'
                              ? `Moved to ${h.to}`
                              : h.type === 'task'
                              ? `Added a task${h.payload?.title ? `: ${h.payload.title}` : ''}`
                              : h.type === 'tailored'
                              ? 'Tailored resume saved to vault'
                              : h.type === 'created'
                              ? 'Created'
                              : 'Updated'}
                          </p>
                          {h.from && (
                            <p className="text-xs text-muted-foreground">{`from ${h.from}`}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{new Date(h.at || new Date()).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                    {/* Fallback entries */}
                    {!viewJob.history && viewJob.appliedDate && (
                      <div className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                        <div className="flex-1">
                          <p className="font-medium">Moved to Applied</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(viewJob.appliedDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={!!editingJob} onOpenChange={(open) => { if (!open) setEditingJob(null) }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update details for this job application</DialogDescription>
          </DialogHeader>
          {editJob && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Job URL</Label>
                  <Input
                    value={editJob.jobUrl}
                    onChange={(e) => setEditJob(prev => ({ ...prev, jobUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input
                    value={editJob.company}
                    onChange={(e) => setEditJob(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input
                    value={editJob.role}
                    onChange={(e) => setEditJob(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={editJob.location}
                    onChange={(e) => setEditJob(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, State or Remote"
                  />
                </div>
                <div>
                  <Label>Source</Label>
                  <Select value={editJob.source} onValueChange={(value) => setEditJob(prev => ({ ...prev, source: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="How did you find this job?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Indeed">Indeed</SelectItem>
                      <SelectItem value="Company Website">Company Website</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Recruiter">Recruiter</SelectItem>
                      <SelectItem value="Job Board">Job Board</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editJob.status} onValueChange={(value) => setEditJob(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Benefits</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editBenefit}
                      onChange={(e) => setEditBenefit(e.target.value)}
                      placeholder="e.g. Health insurance"
                    />
                    <Button type="button" variant="outline" onClick={() => {
                      const trimmed = editBenefit.trim()
                      if (!trimmed) return
                      setEditJob(prev => ({ ...prev, benefits: [...(prev.benefits || []), trimmed] }))
                      setEditBenefit('')
                    }}>Add</Button>
                  </div>
                  {editJob.benefits && editJob.benefits.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {editJob.benefits.map((b, idx) => (
                        <span key={`${b}-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-muted">
                          {b}
                          <button type="button" onClick={() => setEditJob(prev => ({ ...prev, benefits: prev.benefits.filter((_, i) => i !== idx) }))}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Salary Range</Label>
                  <Input
                    value={editJob.salary}
                    onChange={(e) => setEditJob(prev => ({ ...prev, salary: e.target.value }))}
                    placeholder="$80k - $100k"
                  />
                </div>
                <div>
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={editJob.deadline}
                    onChange={(e) => setEditJob(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label>Remarks</Label>
                  <Input
                    value={editJob.nextAction}
                    onChange={(e) => setEditJob(prev => ({ ...prev, nextAction: e.target.value }))}
                    placeholder="Any remarks or follow-ups..."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Job Description</Label>
                  <Textarea
                    value={editJob.jobDescription}
                    onChange={(e) => setEditJob(prev => ({ ...prev, jobDescription: e.target.value }))}
                    placeholder="Paste or summarize the job description..."
                    rows={10}
                    className="h-48 max-h-[40vh] overflow-y-auto resize-y"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setEditingJob(null)}>Cancel</Button>
                <Button onClick={saveEditedJob}>Save Changes</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}