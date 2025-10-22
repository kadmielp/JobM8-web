import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Mail, Phone, Calendar, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export function NetworkTracker() {
  const { toast } = useToast()
  const [contacts, setContacts] = useState([])
  const [filteredContacts, setFilteredContacts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)

  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    tags: [],
    notes: '',
    lastContact: '',
    nextFollowUp: '',
    connectionSource: '',
    linkedinUrl: ''
  })

  const availableTags = [
    'Recruiter', 'Hiring Manager', 'Colleague', 'Alumni', 'Mentor', 
    'Industry Contact', 'Referral', 'Conference', 'LinkedIn', 'Friend'
  ]

  useEffect(() => {
    // Load contacts from localStorage
    const savedContacts = localStorage.getItem('openJobContacts')
    if (savedContacts) {
      const parsedContacts = JSON.parse(savedContacts)
      setContacts(parsedContacts)
      setFilteredContacts(parsedContacts)
    } else {
      // Start with empty contact list - user will add their own contacts
      setContacts([])
      setFilteredContacts([])
    }
  }, [])

  useEffect(() => {
    // Filter contacts based on search and tag
    let filtered = contacts
    
    if (searchTerm) {
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.role.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (filterTag !== 'all') {
      filtered = filtered.filter(contact => contact.tags.includes(filterTag))
    }
    
    setFilteredContacts(filtered)
  }, [contacts, searchTerm, filterTag])

  const saveContacts = (updatedContacts) => {
    localStorage.setItem('openJobContacts', JSON.stringify(updatedContacts))
    setContacts(updatedContacts)
  }

  const addContact = () => {
    const contact = {
      ...newContact,
      id: Date.now()
    }
    const updatedContacts = [...contacts, contact]
    saveContacts(updatedContacts)
    resetForm()
    setIsDialogOpen(false)
    toast({
      title: "Contact Added",
      description: "New contact has been added to your network.",
    })
  }

  const updateContact = () => {
    const updatedContacts = contacts.map(contact => 
      contact.id === editingContact.id ? { ...newContact, id: editingContact.id } : contact
    )
    saveContacts(updatedContacts)
    resetForm()
    setIsDialogOpen(false)
    setEditingContact(null)
    toast({
      title: "Contact Updated",
      description: "Contact information has been updated.",
    })
  }

  const deleteContact = (contactId) => {
    const updatedContacts = contacts.filter(contact => contact.id !== contactId)
    saveContacts(updatedContacts)
    toast({
      title: "Contact Deleted",
      description: "Contact has been removed from your network.",
    })
  }

  const editContact = (contact) => {
    setNewContact(contact)
    setEditingContact(contact)
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setNewContact({
      name: '',
      email: '',
      phone: '',
      company: '',
      role: '',
      tags: [],
      notes: '',
      lastContact: '',
      nextFollowUp: '',
      connectionSource: '',
      linkedinUrl: ''
    })
  }

  const addTag = (tag) => {
    if (!newContact.tags.includes(tag)) {
      setNewContact(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
    }
  }

  const removeTag = (tag) => {
    setNewContact(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const getDaysUntilFollowUp = (date) => {
    if (!date) return null
    const today = new Date()
    const followUpDate = new Date(date)
    const diffTime = followUpDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getFollowUpStatus = (days) => {
    if (days === null) return null
    if (days < 0) return 'overdue'
    if (days === 0) return 'today'
    if (days <= 3) return 'soon'
    return 'future'
  }

  const getFollowUpColor = (status) => {
    switch (status) {
      case 'overdue': return 'bg-red-500'
      case 'today': return 'bg-orange-500'
      case 'soon': return 'bg-yellow-500'
      case 'future': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Network Tracker</h1>
          <p className="text-muted-foreground">Manage your professional contacts and networking activities</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
              <DialogDescription>
                {editingContact ? 'Update contact information' : 'Add a new contact to your network'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label>Company</Label>
                <Input
                  value={newContact.company}
                  onChange={(e) => setNewContact(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label>Role/Title</Label>
                <Input
                  value={newContact.role}
                  onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Job title"
                />
              </div>
              <div>
                <Label>Connection Source</Label>
                <Input
                  value={newContact.connectionSource}
                  onChange={(e) => setNewContact(prev => ({ ...prev, connectionSource: e.target.value }))}
                  placeholder="How you met"
                />
              </div>
              <div>
                <Label>Last Contact</Label>
                <Input
                  type="date"
                  value={newContact.lastContact}
                  onChange={(e) => setNewContact(prev => ({ ...prev, lastContact: e.target.value }))}
                />
              </div>
              <div>
                <Label>Next Follow-up</Label>
                <Input
                  type="date"
                  value={newContact.nextFollowUp}
                  onChange={(e) => setNewContact(prev => ({ ...prev, nextFollowUp: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label>LinkedIn URL</Label>
                <Input
                  value={newContact.linkedinUrl}
                  onChange={(e) => setNewContact(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="col-span-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newContact.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.filter(tag => !newContact.tags.includes(tag)).map(tag => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={newContact.notes}
                  onChange={(e) => setNewContact(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes about this contact..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={editingContact ? updateContact : addContact}>
                {editingContact ? 'Update Contact' : 'Add Contact'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {availableTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map(contact => {
          const followUpDays = getDaysUntilFollowUp(contact.nextFollowUp)
          const followUpStatus = getFollowUpStatus(followUpDays)
          
          return (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{contact.name}</CardTitle>
                    <CardDescription>{contact.role}</CardDescription>
                    <CardDescription className="text-sm">{contact.company}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => editContact(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => deleteContact(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Contact Info */}
                <div className="space-y-1">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3" />
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Follow-up Status */}
                {contact.nextFollowUp && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getFollowUpColor(followUpStatus)}`} />
                    <span className="text-sm text-muted-foreground">
                      Follow-up: {contact.nextFollowUp}
                      {followUpStatus === 'overdue' && ' (Overdue)'}
                      {followUpStatus === 'today' && ' (Today)'}
                      {followUpStatus === 'soon' && ` (${followUpDays} days)`}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {contact.notes && (
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {contact.notes}
                  </p>
                )}

                {/* Last Contact */}
                {contact.lastContact && (
                  <p className="text-xs text-muted-foreground">
                    Last contact: {contact.lastContact}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No contacts found. Add your first contact to get started!</p>
        </div>
      )}
    </div>
  )
}

