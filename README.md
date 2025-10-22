# JobM8 - AI-Powered Job Search Assistant
![GitHub top language](https://img.shields.io/github/languages/top/kadmielp/JobM8) ![GitHub language count](https://img.shields.io/github/languages/count/kadmielp/JobM8) ![GitHub repo size](https://img.shields.io/github/repo-size/kadmielp/JobM8) ![GitHub last commit](https://img.shields.io/github/last-commit/kadmielp/JobM8)

A comprehensive desktop application built with React that helps job seekers manage their entire job search process with AI-powered features.

## 🚀 Features

### Core Functionality
- **Professional Resume Builder** - Comprehensive resume creation with multiple templates and export formats 🆕
- **Master Resume Repository** - Centralized storage for all your professional information with compiled preview
- **AI-Powered CV Import** - Automatically extract and parse CV/resume data using AI
- **Job Application Tracker** - Kanban-style board to track applications through the entire process with enhanced job description formatting 🆕
- **Document Vault** - Secure storage for all job search documents
- **Network Tracker** - Manage professional contacts and networking activities
- **Mock Interview Practice** - AI-powered interview preparation with feedback

### AI Provider Support
- **OpenAI** - GPT-4o, GPT-4o Mini, GPT-3.5 Turbo with automatic model detection
- **Google Gemini** - Gemini 1.5 Pro, Gemini 1.5 Flash with real-time model fetching
- **Maritaca AI** - Sabia models with enhanced API integration and custom endpoint support 🆕
- **Custom Providers** - Configure any OpenAI-compatible API with model discovery
- **Ollama (Local)** - Local AI with automatic model detection and auto-enabling 🆕

### Key Benefits
- **Privacy-First** - All data stored locally with optional encryption
- **Cloud-Powered** - Uses OpenAI for reliable AI processing
- **Customizable** - Flexible AI provider configuration
- **Professional** - Clean, modern interface designed for job seekers

## 📋 Requirements

- Node.js 18+ 
- npm or pnpm
- Modern web browser
- OpenAI API key for AI features

## 🛠️ Installation

### Option 1: Run from Source
```bash
# Clone or extract the application
cd jobm8

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
# or
pnpm dev

# Build for production
npm run build
# or
pnpm build
```

### Option 2: Use Pre-built Version
The `dist/` folder contains a pre-built version ready to serve with any static file server.

```bash
# Serve the built application
npm run preview
# or use any static file server
npx serve dist
```

## 🔧 Configuration

### AI Providers Setup

#### OpenAI (Default Provider)
1. Get API key from https://platform.openai.com
2. In JobM8 Settings → AI Providers → OpenAI:
   - OpenAI is enabled by default
   - Enter your API key
   - Select model (GPT-4o Mini recommended)
   - Test connection

#### Google Gemini (Optional)
1. Get API key from Google AI Studio
2. In JobM8 Settings → AI Providers → Gemini:
   - Enable Gemini
   - Enter your API key
   - Select model
   - Test connection

#### Maritaca AI (Brazilian AI Provider) 🆕
1. Get API key from Maritaca AI
2. In JobM8 Settings → AI Providers → Maritaca:
   - Enable Maritaca
   - Enter Base URL (defaults to https://chat.maritaca.ai/api)
   - Enter your API key
   - Click "Test Connection" or "Fetch Models" to auto-detect available models
   - Select your preferred model

#### Ollama (Local AI)
1. Install and run Ollama locally
2. In JobM8 Settings → AI Providers → Ollama:
   - Enable Ollama
   - Configure host (default: http://localhost:11434)
   - Test connection to fetch available local models
   - Select your preferred model

## 📱 Usage Guide

### Getting Started
1. **Configure AI provider** - Choose and configure your preferred AI service
2. **Set up your resume** - Add your basic information, skills, and experience OR use AI CV Import
3. **Build your resume** - Use the integrated Resume Builder with professional templates
4. **Create master resume** - View your compiled resume in the Master Resumé tab
5. **Start tracking jobs** - Add job applications to the tracker

### AI CV Import (New Feature)
1. Navigate to **Resume Builder**
2. Click **AI Import CV** button
3. Upload your existing CV/resume (PDF, DOC, DOCX, TXT, RTF, or MD)
4. AI will automatically extract and organize your information
5. Review and edit the imported data as needed

**Supported Formats:**
- PDF documents
- Word documents (.doc, .docx)
- Text files (.txt)
- Rich Text Format (.rtf)
- Markdown files (.md)

### Resume Building Workflow
1. Navigate to **Resume Builder**
2. Complete your personal information, experience, education, and skills
3. View your compiled **Master Resumé** in the final tab
4. Export or print your professional resume

### Job Tracking Workflow
1. Go to **Job Tracker**
2. Click **Add Job** to create a new application
   - Single-column scrollable layout with required fields clearly marked
   - **AI Auto-fill**: Click the Sparkles icon to configure AI provider and model, then use the auto-fill button to extract job details from URLs
   - Collapsible AI configuration saves space while providing full control
   - Required fields: Company, Role, Source, Status, Location, Job Description
3. Drag cards between columns to change status (no inline status buttons)
4. Click a card to open a read-only inspector with a clean layout
5. **Analyze job skills** using the enhanced skill extraction system
6. Track your application success rate

**Enhanced Job Description Formatting** 🆕
- Job descriptions automatically convert Markdown syntax to properly formatted HTML
- **Bold text** appears bold, *italic text* appears italic
- Bullet points are properly formatted as lists with proper spacing
- Line breaks are preserved for better readability
- Professional appearance for all job posting content

**Advanced Skill Analysis** 🆕
- **Smart Skill Extraction** - Automatically extract skills from job descriptions using taxonomy matching or AI analysis
- **Provider Selection** - Choose specific AI provider and model for skill extraction
- **Hybrid Analysis** - Combines fast taxonomy matching with intelligent AI enhancement
- **Automatic Comparison** - Skills are instantly compared with your resume profile
- **Match Categorization** - Skills organized into Strong Match, Partial Match, and Missing Keywords
- **Enhanced Deduplication** - Removes duplicates and normalizes skill names using taxonomy
- **Confidence Scoring** - Each match includes confidence levels and match quality indicators

### Document Management
1. Use **Document Vault** to store all job search files
2. Upload resumes, cover letters, certificates
3. Organize with tags and categories
4. Access files from anywhere in the app

## 🎯 Advanced Features

### Mock Interviews
- Practice with AI-generated questions
- Get feedback on your responses
- Improve your interview performance

### Network Tracking
- Manage professional contacts
- Set follow-up reminders
- Track networking activities

## 🔒 Privacy & Security

- **Local Storage** - All data stored in your browser's local storage
- **No Cloud Dependency** - Works completely offline with Ollama
- **Encryption** - Optional data encryption for sensitive information
- **No Tracking** - No analytics or user tracking

## 🛡️ Data Management

### Backup & Export
- Export all data as JSON from Settings → Data Management
- Import data to restore or transfer between devices
- Regular backups recommended

### Storage Usage
- Monitor storage usage in Settings
- Clear data when needed
- Automatic cleanup options available

## 🎨 Customization

### Themes
- Light/Dark mode toggle
- System theme detection
- Customizable color schemes

### Resume Templates
- Modern Professional - Clean contemporary design
- Classic Traditional - Conservative industry format
- Creative Design - Eye-catching for creative roles
- Minimal Clean - Simple elegant layout
- Professional HTML formatting with print-friendly styles
- Multiple export formats: TXT, HTML, PDF

## 🔧 Troubleshooting

### Common Issues

**AI Provider Connection Failed**
- Check API keys are correct
- Verify network connectivity
- For Ollama, ensure service is running with `ollama serve`
- Try different models if current model is unavailable
- Check host URL format (should start with http:// or https://)

**Skill Analysis Not Working**
- Verify AI provider is configured and connected
- Try "Analyze Skills (Fast)" if AI Enhanced fails
- Check job description contains sufficient text
- Ensure resume profile has skills data

**Ollama Connection Issues**
- Start Ollama service: `ollama serve`
- Use correct host: `http://localhost:11434` or `http://127.0.0.1:11434`
- Pull required models: `ollama pull model-name`
- Check firewall settings for local connections
- For CORS issues, run Ollama with: `ollama serve --host 0.0.0.0`

**Resume Generation Not Working**
- Verify AI provider is configured
- Check that profile information is complete
- Try different AI models

**Application Won't Load**
- Clear browser cache
- Check browser console for errors
- Try incognito/private mode

### Performance Tips
- Use local AI (Ollama) for faster responses
- Regularly clean up old data
- Close unused browser tabs

## 📞 Support

### Getting Help
- Check the troubleshooting section above
- Review AI provider documentation
- Ensure all requirements are met

### Feature Requests
This is a complete, self-contained application. All core features are implemented and ready to use.

## 📄 License

This application is provided as-is for personal and professional use.

---

**Built with React, Vite, and modern web technologies for a fast, responsive experience.**

