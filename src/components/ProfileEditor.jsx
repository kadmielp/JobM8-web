import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, Upload, Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { AICVImport } from '@/components/AICVImport'

export function ProfileEditor() {
  const { toast } = useToast()
  const emptyProfile = {
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      website: '',
      summary: ''
    },
    experiences: [],
    education: [],
    skills: [],
    projects: [],
    achievements: []
  }
  const [profile, setProfile] = useState(emptyProfile)

  const [editingExperience, setEditingExperience] = useState(null)
  const [editingEducation, setEditingEducation] = useState(null)
  const [newSkill, setNewSkill] = useState('')
  const [showAIImport, setShowAIImport] = useState(false)
  const [showEraseDialog, setShowEraseDialog] = useState(false)

  useEffect(() => {
    // Load profile from localStorage
    const savedProfile = localStorage.getItem('openJobProfile')
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile))
    }
  }, [])

  const saveProfile = () => {
    localStorage.setItem('openJobProfile', JSON.stringify(profile))
    toast({
      title: "Profile Saved",
      description: "Your profile has been saved successfully.",
    })
  }

  const eraseProfile = () => {
    try {
      localStorage.removeItem('openJobProfile')
    } catch {}
    setProfile(emptyProfile)
    setShowEraseDialog(false)
    toast({
      title: 'Profile erased',
      description: 'All resume fields were cleared.',
    })
  }

  const updatePersonalInfo = (field, value) => {
    setProfile(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }))
  }

  const addExperience = () => {
    const newExp = {
      id: Date.now(),
      role: '',
      company: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: [''],
      skills: []
    }
    setProfile(prev => ({
      ...prev,
      experiences: [...prev.experiences, newExp]
    }))
    setEditingExperience(newExp.id)
  }

  const updateExperience = (id, field, value) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.map(exp => 
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }))
  }

  const addBulletPoint = (expId) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.map(exp => 
        exp.id === expId ? { ...exp, bullets: [...exp.bullets, ''] } : exp
      )
    }))
  }

  const updateBulletPoint = (expId, bulletIndex, value) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.map(exp => 
        exp.id === expId ? {
          ...exp,
          bullets: exp.bullets.map((bullet, index) => 
            index === bulletIndex ? value : bullet
          )
        } : exp
      )
    }))
  }

  const removeBulletPoint = (expId, bulletIndex) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.map(exp => 
        exp.id === expId ? {
          ...exp,
          bullets: exp.bullets.filter((_, index) => index !== bulletIndex)
        } : exp
      )
    }))
  }

  const deleteExperience = (id) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.filter(exp => exp.id !== id)
    }))
  }

  const addEducation = () => {
    const newEdu = {
      id: Date.now(),
      school: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      gpa: '',
      achievements: []
    }
    setProfile(prev => ({
      ...prev,
      education: [...prev.education, newEdu]
    }))
    setEditingEducation(newEdu.id)
  }

  const updateEducation = (id, field, value) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.map(edu => 
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }))
  }

  const deleteEducation = (id) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }))
  }

  const addSkill = () => {
    if (newSkill.trim()) {
      // Split by comma and process each skill
      const skillsToAdd = newSkill
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill && !profile.skills.includes(skill))
      
      if (skillsToAdd.length > 0) {
        setProfile(prev => ({
          ...prev,
          skills: [...prev.skills, ...skillsToAdd]
        }))
        setNewSkill('')
      }
    }
  }

  const removeSkill = (skill) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }))
  }

  const exportProfile = () => {
    const dataStr = JSON.stringify(profile, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'openjob-profile.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importProfile = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedProfile = JSON.parse(e.target.result)
          setProfile(importedProfile)
          toast({
            title: "Profile Imported",
            description: "Your profile has been imported successfully.",
          })
        } catch (error) {
          toast({
            title: "Import Error",
            description: "Failed to import profile. Please check the file format.",
            variant: "destructive"
          })
        }
      }
      reader.readAsText(file)
    }
  }

  const handleAIImportComplete = (importedData) => {
    setProfile(importedData)
    toast({
      title: "CV Imported Successfully",
      description: "Your CV has been analyzed and imported by AI.",
    })
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resume Builder</h1>
          <p className="text-muted-foreground">Manage your master resumé repository</p>
        </div>
        <div className="flex gap-2">
          {/* Discrete erase button (icon-only) */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setShowEraseDialog(true)}
            title="Erase resume"
            aria-label="Erase resume"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={exportProfile}>
            <Upload className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label>
            <Button variant="outline" asChild>
              <span>
                <Download className="h-4 w-4 mr-2" />
                Import JSON
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={importProfile}
              className="hidden"
            />
          </label>
          <Button variant="outline" onClick={() => setShowAIImport(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Import CV
          </Button>
          <Button onClick={saveProfile}>
            <Save className="h-4 w-4 mr-2" />
            Save Profile
          </Button>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="projects">Master Resumé</TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your basic contact information and professional summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.personalInfo.name}
                    onChange={(e) => updatePersonalInfo('name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.personalInfo.email}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profile.personalInfo.phone}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profile.personalInfo.location}
                    onChange={(e) => updatePersonalInfo('location', e.target.value)}
                    placeholder="San Francisco, CA"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={profile.personalInfo.linkedin}
                    onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                    placeholder="linkedin.com/in/johndoe"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website/Portfolio</Label>
                  <Input
                    id="website"
                    value={profile.personalInfo.website}
                    onChange={(e) => updatePersonalInfo('website', e.target.value)}
                    placeholder="johndoe.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="summary">Professional Summary</Label>
                <Textarea
                  id="summary"
                  value={profile.personalInfo.summary}
                  onChange={(e) => updatePersonalInfo('summary', e.target.value)}
                  placeholder="A brief professional summary highlighting your key strengths and career objectives..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience */}
        <TabsContent value="experience">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Work Experience</h2>
              <Button onClick={addExperience}>
                <Plus className="h-4 w-4 mr-2" />
                Add Experience
              </Button>
            </div>

            {profile.experiences.map((exp) => (
              <Card key={exp.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{exp.role || 'New Position'}</CardTitle>
                      <CardDescription>{exp.company}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingExperience(editingExperience === exp.id ? null : exp.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteExperience(exp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {editingExperience === exp.id && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Job Title</Label>
                        <Input
                          value={exp.role}
                          onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <Label>Company</Label>
                        <Input
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                          placeholder="Tech Company Inc."
                        />
                      </div>
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                          placeholder="2020 or 2020-01"
                        />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input
                          value={exp.endDate}
                          onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                          placeholder="2024 or 2024-05"
                          disabled={exp.current}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Key Achievements & Responsibilities</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addBulletPoint(exp.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Bullet
                        </Button>
                      </div>
                      {exp.bullets.map((bullet, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Textarea
                            value={bullet}
                            onChange={(e) => updateBulletPoint(exp.id, index, e.target.value)}
                            placeholder="Describe your achievement or responsibility..."
                            rows={2}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeBulletPoint(exp.id, index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Education */}
        <TabsContent value="education">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Education</h2>
              <Button onClick={addEducation}>
                <Plus className="h-4 w-4 mr-2" />
                Add Education
              </Button>
            </div>

            {profile.education.map((edu) => (
              <Card key={edu.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{edu.degree || 'New Degree'}</CardTitle>
                      <CardDescription>{edu.school}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEducation(editingEducation === edu.id ? null : edu.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteEducation(edu.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {editingEducation === edu.id && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>School/University</Label>
                        <Input
                          value={edu.school}
                          onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                          placeholder="University of Technology"
                        />
                      </div>
                      <div>
                        <Label>Degree</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                          placeholder="Bachelor of Science"
                        />
                      </div>
                      <div>
                        <Label>Field of Study</Label>
                        <Input
                          value={edu.field}
                          onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                          placeholder="Computer Science"
                        />
                      </div>
                      <div>
                        <Label>GPA (Optional)</Label>
                        <Input
                          value={edu.gpa}
                          onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                          placeholder="3.8/4.0"
                        />
                      </div>
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          value={edu.startDate}
                          onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                          placeholder="2020 or 2020-01"
                        />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input
                          value={edu.endDate}
                          onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                          placeholder="2024 or 2024-05"
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Skills */}
        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Add your technical and soft skills. Separate multiple skills with commas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Enter skills separated by commas (e.g., React, Node.js, Python)"
                  onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                />
                <Button onClick={addSkill}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills
                  .slice()
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                  .map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-2 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Master Resumé (compiled view) */}
        <TabsContent value="projects">
          <div className="mb-3">
            <h2 className="text-xl font-semibold">Master Resumé</h2>
            <p className="text-sm text-muted-foreground">A compiled, neatly formatted view of your information</p>
          </div>
          <Card>
            <CardContent>
              {(() => {
                const { personalInfo, experiences, education, skills } = profile

                const contactItems = [
                  personalInfo.email && `Email: ${personalInfo.email}`,
                  personalInfo.phone && `Phone: ${personalInfo.phone}`,
                  personalInfo.location && personalInfo.location,
                  personalInfo.linkedin && personalInfo.linkedin,
                  personalInfo.website && personalInfo.website,
                ].filter(Boolean)

                const formatRange = (start, end) => {
                  if (start && end) return `${start} — ${end}`
                  if (start && !end) return `${start} — Present`
                  return end || ''
                }

                return (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="space-y-1">
                      {personalInfo.name && (
                        <h2 className="text-2xl font-bold tracking-tight">{personalInfo.name}</h2>
                      )}
                      {contactItems.length > 0 && (
                        <p className="text-sm text-muted-foreground">{contactItems.join(' • ')}</p>
                      )}
                    </div>

                    {personalInfo.summary && (
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Summary</h3>
                        <p className="leading-relaxed">{personalInfo.summary}</p>
                        <Separator />
                      </div>
                    )}

                    {/* Experience */}
                    {experiences && experiences.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Experience</h3>
                        <div className="space-y-4">
                          {experiences.map((exp) => (
                            <div key={exp.id} className="space-y-1">
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
                          ))}
                        </div>
                        <Separator />
                      </div>
                    )}

                    {/* Education */}
                    {education && education.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Education</h3>
                        <div className="space-y-3">
                          {education.map((edu) => (
                            <div key={edu.id} className="space-y-1">
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
                          ))}
                        </div>
                        <Separator />
                      </div>
                    )}

                    {/* Skills */}
                    {skills && skills.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((s, i) => (
                            <Badge key={`${s}-${i}`} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI CV Import Dialog */}
      <AICVImport 
        isOpen={showAIImport}
        onClose={() => setShowAIImport(false)}
        onImportComplete={handleAIImportComplete}
      />

      {/* Confirm erase dialog */}
      <Dialog open={showEraseDialog} onOpenChange={setShowEraseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erase resume?</DialogTitle>
            <DialogDescription>
              This will clear all fields in Resume Builder. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowEraseDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={eraseProfile}>Erase</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

