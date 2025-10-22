import { useState, useEffect } from 'react'
import { FileText, Wand2, Download, Copy, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export function CoverLetterGenerator() {
  const { toast } = useToast()
  const [profile, setProfile] = useState(null)
  const [jobDetails, setJobDetails] = useState({
    company: '',
    role: '',
    hiringManager: '',
    jobDescription: ''
  })
  const [settings, setSettings] = useState({
    tone: 'professional',
    length: 'standard',
    focus: 'balanced'
  })
  const [generatedLetter, setGeneratedLetter] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    // Load profile from localStorage
    const savedProfile = localStorage.getItem('openJobProfile')
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile))
    }
  }, [])

  const generateCoverLetter = async () => {
    if (!profile) {
      toast({
        title: "No Profile Found",
        description: "Please complete your profile first in the Profile Editor.",
        variant: "destructive"
      })
      return
    }

    if (!jobDetails.company || !jobDetails.role) {
      toast({
        title: "Missing Job Details",
        description: "Please provide at least the company name and role.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const letter = generateMockCoverLetter(profile, jobDetails, settings)
      setGeneratedLetter(letter)
      
      toast({
        title: "Cover Letter Generated",
        description: "Your cover letter has been created successfully.",
      })
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate cover letter. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateMockCoverLetter = (profile, jobDetails, settings) => {
    const { personalInfo } = profile
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    let letter = `${personalInfo.name}\n`
    letter += `${personalInfo.email} | ${personalInfo.phone}\n`
    letter += `${personalInfo.location}\n\n`
    
    letter += `${currentDate}\n\n`
    
    if (jobDetails.hiringManager) {
      letter += `${jobDetails.hiringManager}\n`
    }
    letter += `${jobDetails.company}\n\n`
    
    letter += `Dear ${jobDetails.hiringManager || 'Hiring Manager'},\n\n`
    
    // Opening paragraph
    letter += `I am writing to express my strong interest in the ${jobDetails.role} position at ${jobDetails.company}. `
    
    if (settings.tone === 'enthusiastic') {
      letter += `I am excited about the opportunity to contribute to your team and bring my passion for innovation to this role.\n\n`
    } else if (settings.tone === 'confident') {
      letter += `With my proven track record and expertise, I am confident I would be a valuable addition to your team.\n\n`
    } else {
      letter += `I believe my background and skills align well with the requirements for this position.\n\n`
    }
    
    // Body paragraph - Experience
    letter += `In my previous roles, I have developed strong expertise in areas directly relevant to this position. `
    
    if (profile.experiences && profile.experiences.length > 0) {
      const latestExp = profile.experiences[0]
      letter += `As a ${latestExp.role} at ${latestExp.company}, I have gained valuable experience that would translate well to the ${jobDetails.role} role. `
    }
    
    letter += `My technical skills and problem-solving abilities have consistently enabled me to deliver results and exceed expectations.\n\n`
    
    // Body paragraph - Value proposition
    letter += `What particularly excites me about ${jobDetails.company} is your commitment to innovation and excellence. `
    letter += `I am eager to bring my skills in `
    
    if (profile.skills && profile.skills.length > 0) {
      letter += profile.skills.slice(0, 3).join(', ')
    } else {
      letter += 'technology and problem-solving'
    }
    
    letter += ` to help drive your team's success. I am particularly drawn to this opportunity because it aligns perfectly with my career goals and passion for making a meaningful impact.\n\n`
    
    // Closing paragraph
    letter += `I would welcome the opportunity to discuss how my background and enthusiasm can contribute to ${jobDetails.company}'s continued success. `
    letter += `Thank you for considering my application. I look forward to hearing from you soon.\n\n`
    
    letter += `Sincerely,\n${personalInfo.name}`
    
    return letter
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLetter)
    toast({
      title: "Copied to Clipboard",
      description: "Cover letter has been copied to your clipboard.",
    })
  }

  const downloadLetter = () => {
    const blob = new Blob([generatedLetter], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cover-letter-${jobDetails.company}-${jobDetails.role}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cover Letter Generator</h1>
          <p className="text-muted-foreground">Create personalized cover letters for your job applications</p>
        </div>
        <div className="flex gap-2">
          {generatedLetter && (
            <>
              <Button variant="outline" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" onClick={downloadLetter}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Information about the position you're applying for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  value={jobDetails.company}
                  onChange={(e) => setJobDetails(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label htmlFor="role">Job Title *</Label>
                <Input
                  id="role"
                  value={jobDetails.role}
                  onChange={(e) => setJobDetails(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Position title"
                />
              </div>
              <div>
                <Label htmlFor="hiringManager">Hiring Manager (Optional)</Label>
                <Input
                  id="hiringManager"
                  value={jobDetails.hiringManager}
                  onChange={(e) => setJobDetails(prev => ({ ...prev, hiringManager: e.target.value }))}
                  placeholder="Hiring manager's name"
                />
              </div>
              <div>
                <Label htmlFor="jobDescription">Job Description (Optional)</Label>
                <Textarea
                  id="jobDescription"
                  value={jobDetails.jobDescription}
                  onChange={(e) => setJobDetails(prev => ({ ...prev, jobDescription: e.target.value }))}
                  placeholder="Paste the job description to help tailor the cover letter..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Generation Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Writing Style</CardTitle>
              <CardDescription>Customize the tone and style of your cover letter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tone</Label>
                <Select value={settings.tone} onValueChange={(value) => setSettings(prev => ({ ...prev, tone: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="confident">Confident</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Length</Label>
                <Select value={settings.length} onValueChange={(value) => setSettings(prev => ({ ...prev, length: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Focus</Label>
                <Select value={settings.focus} onValueChange={(value) => setSettings(prev => ({ ...prev, focus: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="experience">Experience</SelectItem>
                    <SelectItem value="skills">Skills</SelectItem>
                    <SelectItem value="achievements">Achievements</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={generateCoverLetter} 
                disabled={isGenerating || !jobDetails.company || !jobDetails.role}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Generated Cover Letter</CardTitle>
              <CardDescription>Your personalized cover letter</CardDescription>
            </CardHeader>
            <CardContent>
              {generatedLetter ? (
                <Textarea
                  value={generatedLetter}
                  onChange={(e) => setGeneratedLetter(e.target.value)}
                  rows={25}
                  className="resize-none font-mono text-sm"
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Fill in the job details and click "Generate Cover Letter" to get started</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle>Cover Letter Tips</CardTitle>
          <CardDescription>Best practices for effective cover letters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Personalization</h4>
              <p className="text-sm text-muted-foreground">
                Always address the hiring manager by name when possible and mention specific details about the company.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Value Proposition</h4>
              <p className="text-sm text-muted-foreground">
                Clearly articulate what unique value you bring to the role and how you can solve their problems.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Call to Action</h4>
              <p className="text-sm text-muted-foreground">
                End with a strong call to action that expresses your enthusiasm for next steps.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

