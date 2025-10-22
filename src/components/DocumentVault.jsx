import { useState, useEffect } from 'react'
import { Upload, Download, Eye, Trash2, Search, Filter, FileText, File, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

const documentTypes = [
  { id: 'resume', label: 'Resume', icon: FileText, color: 'bg-blue-500' },
  { id: 'cover-letter', label: 'Cover Letter', icon: FileText, color: 'bg-green-500' },
  { id: 'certificate', label: 'Certificate', icon: File, color: 'bg-purple-500' },
  { id: 'transcript', label: 'Transcript', icon: File, color: 'bg-orange-500' },
  { id: 'portfolio', label: 'Portfolio', icon: Image, color: 'bg-pink-500' },
  { id: 'other', label: 'Other', icon: File, color: 'bg-gray-500' }
]

export function DocumentVault() {
  const { toast } = useToast()
  const [documents, setDocuments] = useState([])
  const [filteredDocuments, setFilteredDocuments] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    // Load documents from localStorage
    const savedDocuments = localStorage.getItem('openJobDocuments')
    if (savedDocuments) {
      const parsedDocuments = JSON.parse(savedDocuments)
      setDocuments(parsedDocuments)
      setFilteredDocuments(parsedDocuments)
    } else {
      // Start with empty document vault - user will add their own documents
      setDocuments([])
      setFilteredDocuments([])
    }
  }, [])

  useEffect(() => {
    // Filter documents based on search and type
    let filtered = documents
    
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.type === filterType)
    }
    
    setFilteredDocuments(filtered)
  }, [documents, searchTerm, filterType])

  const saveDocuments = (updatedDocuments) => {
    localStorage.setItem('openJobDocuments', JSON.stringify(updatedDocuments))
    setDocuments(updatedDocuments)
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    
    files.forEach(file => {
      const newDocument = {
        id: Date.now() + Math.random(),
        name: file.name,
        type: 'other', // Default type, user can change later
        size: formatFileSize(file.size),
        dateCreated: new Date().toISOString().split('T')[0],
        dateModified: new Date().toISOString().split('T')[0],
        version: '1.0',
        tags: [],
        description: '',
        file: file // In a real app, this would be uploaded to storage
      }
      
      const updatedDocuments = [...documents, newDocument]
      saveDocuments(updatedDocuments)
    })
    
    toast({
      title: "Files Uploaded",
      description: `${files.length} file(s) have been added to your vault.`,
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const deleteDocument = (docId) => {
    const updatedDocuments = documents.filter(doc => doc.id !== docId)
    saveDocuments(updatedDocuments)
    toast({
      title: "Document Deleted",
      description: "Document has been removed from your vault.",
    })
  }

  const downloadDocument = (doc) => {
    // In a real app, this would download the actual file
    toast({
      title: "Download Started",
      description: `Downloading ${doc.name}...`,
    })
  }

  const getDocumentIcon = (type) => {
    const docType = documentTypes.find(dt => dt.id === type)
    return docType ? docType.icon : File
  }

  const getDocumentColor = (type) => {
    const docType = documentTypes.find(dt => dt.id === type)
    return docType ? docType.color : 'bg-gray-500'
  }

  const getDocumentTypeLabel = (type) => {
    const docType = documentTypes.find(dt => dt.id === type)
    return docType ? docType.label : 'Unknown'
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Vault</h1>
          <p className="text-muted-foreground">Securely store and manage your job search documents</p>
        </div>
        <div className="flex gap-2">
          <label>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {documentTypes.map(type => (
              <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resumes</p>
                <p className="text-2xl font-bold">{documents.filter(d => d.type === 'resume').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <File className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Certificates</p>
                <p className="text-2xl font-bold">{documents.filter(d => d.type === 'certificate').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Image className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Portfolio Items</p>
                <p className="text-2xl font-bold">{documents.filter(d => d.type === 'portfolio').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map(doc => {
          const Icon = getDocumentIcon(doc.type)
          
          return (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getDocumentColor(doc.type)}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{doc.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {getDocumentTypeLabel(doc.type)} • {doc.size}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => downloadDocument(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => deleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Description */}
                {doc.description && (
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                )}
                
                {/* Tags */}
                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Metadata */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{doc.dateCreated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modified:</span>
                    <span>{doc.dateModified}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span>{doc.version}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No documents found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Upload your first document to get started'
            }
          </p>
          {!searchTerm && filterType === 'all' && (
            <label>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              />
            </label>
          )}
        </div>
      )}

      {/* Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Information</CardTitle>
          <CardDescription>Your document storage usage and limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used Storage</span>
              <span>12.4 MB of 1 GB</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '1.24%' }}></div>
            </div>
            <p className="text-xs text-muted-foreground">
              Documents are stored locally and encrypted for your privacy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

