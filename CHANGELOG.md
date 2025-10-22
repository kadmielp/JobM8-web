# Changelog
## [2.1.3] - Collapsible AI Configuration

### Enhanced
- **AI Auto-fill Interface** - Redesigned AI provider and model selection with collapsible interface
  - Click-to-expand AI configuration panel with Sparkles icon trigger
  - Compact header showing current provider and model when collapsed
  - Auto-fill button only appears when AI is properly configured
  - Visual status indicators with "Ready" confirmation
  - Animated chevron icon for clear expand/collapse feedback
  - Cleaner job application form with reduced visual clutter

### Changed
- **AI Configuration Layout** - More space-efficient and user-friendly design
  - Collapsible panel saves vertical space in job application form
  - Provider and model information displayed in header when configured
  - Streamlined two-column grid layout within expanded configuration
  - Enhanced user experience with contextual auto-fill button visibility

## [2.1.2] - Enhanced Job Application Form

### Enhanced
- **Job Application Form** - Completely redesigned "Add New Job Application" form for better usability
  - Single-column scrollable layout replacing previous 3-column grid design
  - Mandatory field validation with visual indicators (red labels with asterisks)
  - Required fields: Company, Role, Source, Status, Location, and Job Description
  - Sticky action buttons that remain visible during scrolling
  - Organized sections: "Required Information" and "Additional Information"
  - Form submission disabled until all required fields are completed
  - Improved user experience with better spacing and clear field organization

### Changed
- **Form Layout** - Streamlined interface with enhanced accessibility
  - Scrollable content area with fixed action buttons at bottom
  - Visual distinction between required and optional fields
  - Enhanced placeholder text and field descriptions
  - Better responsive design for various screen sizes

## [2.1.1] - Improved AI Service Reliability

### Enhanced
- **AI Service Robustness** - Significantly improved AI provider reliability and error handling
  - Added intelligent fallback to taxonomy-only extraction when AI analysis fails
  - Enhanced Ollama model validation with partial matching for version differences
  - Improved connection testing with extended timeouts and specific error messages
  - Better input validation and response parsing for all AI providers
  - Detailed logging and debugging information for troubleshooting AI issues
- **Ollama Integration** - Enhanced local AI support with better model management
  - Added model validation endpoint with fallback to /api/show
  - Improved partial matching for model names (handles version differences)
  - Extended connection timeout to 15 seconds for better reliability
  - Enhanced error messages with specific troubleshooting guidance
- **Error Handling** - More descriptive and actionable error messages across all AI providers
  - Specific timeout handling for slow or unresponsive AI services
  - Network error detection with suggested fixes
  - CORS error handling with configuration guidance
  - Better handling of malformed AI responses

### Fixed
- **AI Analysis Failures** - Graceful degradation when AI analysis encounters issues
  - Automatic fallback to taxonomy extraction ensures functionality continues
  - Preserved user experience even when AI services are temporarily unavailable
  - Improved error reporting without breaking the analysis workflow

## [2.1.0] - Enhanced Skill Analysis System

### Added
- **Advanced Skill Extraction** - Revolutionized job skill analysis with hybrid AI approach
  - Smart skill extraction from job descriptions using taxonomy matching or AI analysis
  - AI provider and model selection for skill extraction with dynamic model loading
  - Taxonomy-based deduplication and normalization for consistent skill names
  - Enhanced partial matching with semantic similarity and confidence scoring
  - Technology relationship detection (e.g., JavaScript → React, Node.js)
- **Streamlined Analysis Workflow** - One-click skill analysis and comparison
  - Automatic skill comparison integrated into extraction process
  - Eliminated separate "Compare Skills" button for better user experience
  - Instant results with match categorization and scoring
  - Enhanced progress feedback with match score in success messages
- **Improved Skill Matching** - More accurate and intelligent skill comparison
  - Enhanced fuzzy matching with edit distance calculations
  - Word-based similarity detection for compound skills
  - Confidence-based scoring for partial matches (0.4-0.9 range)
  - Technology stack relationship mapping for better contextual matches

### Enhanced
- **Skill Analysis UI** - Redesigned interface for better usability
  - Split analysis options: "Analyze Skills (Fast)" vs "AI Enhanced Analysis"
  - Provider/model selection popover with real-time model loading
  - Automatic skill bucket population (Strong Match, Partial Match, Missing Keywords)
  - Improved error handling with specific provider configuration messages
- **Taxonomy Management** - Cleaned up and consolidated skill taxonomy
  - Grouped multitasking-related skills under single canonical entry
  - Removed redundant and overly generic skill entries
  - Enhanced skill aliases for better matching coverage
  - Streamlined taxonomy structure for improved performance

### Fixed
- **Skill Display Bug** - Fixed issue where skills didn't appear in match categories after analysis
  - Corrected data structure inconsistency between automatic and manual analysis
  - Ensured proper skill bucket population in UI components
  - Fixed skill extraction state management for consistent results

## [2.0.0] - Application Streamlining

### Removed
- **Resume Tailoring Component** - Removed from sidebar navigation and application
- **Cover Letter Generator Component** - Removed from sidebar navigation and application  
- **Skill Gap Analyzer Component** - Removed from sidebar navigation and application

### Changed
- **Sidebar Navigation** - Streamlined navigation menu with focus on core features
- **Application Scope** - Reduced from 10 to 7 main navigation items for better focus

### Technical
- **Component Cleanup** - Removed unused icon imports (Target, MessageSquare, BarChart3)
- **Navigation Simplification** - Cleaner, more focused user experience

## [1.9.0] - 2025-01-11

### Added
- **AI Configuration Overhaul** - Complete redesign of AI provider configuration and model selection
  - Real-time connection status indicators for all AI providers
  - Provider status dashboard showing connection health
  - Auto-provider selection when component loads
  - Refresh buttons for testing connections and updating model lists
- **Enhanced Model Detection** - Fixed issues with AI model connections not being detected properly
  - Automatic model loading from localStorage cache
  - Real-time model fetching with connection testing
  - Better error handling for connection failures
  - Provider-specific configuration validation
- **Ollama Auto-Detection** - Automatic detection and enabling of locally running Ollama instances
  - Auto-enables Ollama when found running locally
  - Updates settings automatically when Ollama is detected
  - Provides setup instructions for Ollama installation
  - Better error messages for Ollama connection issues

### Enhanced
- **Resume Tailoring AI Configuration** - Significantly improved AI provider management interface
  - Cleaner model dropdowns without technical size information
  - Better provider selection with status indicators
  - Connection testing with detailed feedback
  - Provider-specific error messages and setup guidance
- **Connection Testing** - Enhanced connection testing with timeout handling and specific error messages
  - 10-second timeout for connection tests
  - Provider-specific error handling (Ollama vs API-based)
  - Better network error detection and reporting
  - CORS error handling for local development
- **Provider Management** - Improved provider configuration and status tracking
  - Real-time status updates across all providers
  - Better validation of provider configurations
  - Enhanced error messages for different failure types
  - Automatic provider enabling when configurations are valid

### Changed
- **Model Display** - Simplified model selection dropdowns
  - Removed model size information for cleaner appearance
  - Better model name formatting and display
  - Improved placeholder text and selection states
- **Provider Status Display** - Enhanced visual feedback for provider connections
  - Color-coded status indicators (green for connected, red for failed)
  - Real-time status updates with connection testing
  - Better error message formatting and guidance

### Fixed
- **Model Detection Issues** - Resolved problems with AI models not being detected
  - Fixed provider configuration loading from localStorage
  - Corrected Ollama host validation and connection testing
  - Improved error handling for network failures
  - Better fallback mechanisms when connections fail
- **AI Configuration UI** - Fixed issues with provider selection and model loading
  - Resolved blank provider dropdowns
  - Fixed model selection persistence
  - Improved error state handling
  - Better loading states and user feedback

### Technical
- **Enhanced AIService** - Improved Ollama connection testing with better error handling
  - Added timeout handling with AbortSignal
  - Better validation of host URLs and response formats
  - Enhanced error categorization and reporting
  - Improved fallback mechanisms for connection failures
- **State Management** - Better handling of AI provider states and configurations
  - Improved localStorage integration for provider settings
  - Better state synchronization between components
  - Enhanced error state management
  - Improved loading state handling

## [1.8.0] - 2025-01-11

### Added
- **Maritaca AI Provider Support** - Full integration with Brazilian AI provider
  - Custom Base URL configuration (defaults to https://chat.maritaca.ai/api)
  - Automatic model detection and fetching from API
  - Support for Sabia models (Sabia 2 Medium, Sabia 2 Small, Sabia 3, Maritalk)
  - Fallback model testing when API endpoints are unavailable
- **Enhanced Connection Testing** - Comprehensive AI provider connection testing
  - Multiple endpoint support for model discovery
  - Better error handling with detailed error messages
  - Automatic model selection when connection succeeds
  - Dedicated "Fetch Models" button for refreshing model lists
- **Dynamic Model Fetching** - All AI providers now automatically fetch available models
  - Real-time model detection from API endpoints
  - Support for different API response formats
  - Automatic model dropdown population

### Enhanced
- **Settings Component Stability** - Fixed blank screen issues and improved error handling
- **AI Service Architecture** - Complete overhaul of provider management
  - Enhanced testConnection method with provider-specific implementations
  - Better response parsing for different API formats
  - Improved fallback mechanisms when primary endpoints fail
- **Connection Testing UI** - More informative feedback and better user experience
  - Loading states with spinner indicators
  - Success notifications with model counts
  - Detailed error messages for troubleshooting

### Changed
- **Ollama Provider** - Re-enabled with improved local model detection
- **Provider Configuration** - Enhanced settings interface with better organization
- **Model Selection** - Automatic population from API instead of hardcoded lists
- **Error Messages** - More descriptive error information for connection failures

### Fixed
- **Settings Blank Screen** - Resolved component rendering issues
- **Connection Testing** - Fixed disabled connection testing functionality
- **Model Loading** - Proper model fetching and display in dropdowns
- **API Response Handling** - Better parsing of different provider response formats

### Technical
- **AIService Refactoring** - Modular provider-specific test methods
- **Enhanced Error Handling** - Try-catch blocks with detailed error reporting
- **API Endpoint Discovery** - Multiple endpoint testing for model fetching
- **Response Format Handling** - Support for various API response structures
- **State Management** - Improved settings state handling and persistence

## [1.7.0]

### Added
- **Enhanced Job Description Formatting** - Job descriptions now automatically convert Markdown syntax to properly formatted HTML
- **Professional Text Rendering** - Bold text, italic text, and bullet points are now properly displayed
- **Improved Readability** - Better spacing, typography, and visual hierarchy for job posting content

### Enhanced
- **Job Description Display** - Replaced raw text display with formatted HTML rendering
- **Visual Typography** - Better spacing, margins, and list formatting for job posting content
- **User Experience** - Cleaner, more professional appearance for all job descriptions

### Technical
- **Markdown to HTML Conversion** - Added utility function to convert common Markdown patterns to HTML
- **No Additional Dependencies** - Lightweight solution using built-in React capabilities
- **Tailwind CSS Integration** - Enhanced styling using arbitrary value selectors for better visual hierarchy

## [1.6.0]

### Added
- **Google Search Integration** - Click any skill to search for definitions and learning resources
- **Enhanced Skill Management** - Add skills to resume, ignore irrelevant skills, or search for more information
- **Improved Button Layout** - Consistent button order across all skill categories (Add → Google → Ignore)

### Changed
- **Navigation Updates** - Skills section renamed to "Skill Gap Analysis" with Gauge icon
- **Button Design** - Replaced text buttons with icon-only buttons for better space utilization
- **Icon Consistency** - Updated Google search buttons to use Search icon instead of TextSearch
- **UI Improvements** - Cleaner popover layout with inline action buttons

### Enhanced
- **Skill Gap Analysis UI** - Better visual organization and more intuitive skill management
- **Button Tooltips** - Improved hover tooltips for all action buttons
- **Skill Categories** - Consistent layout and functionality across Strong Match, Partial Match, and Missing Keywords

### Technical
- **Icon Updates** - Added Gauge icon import and updated navigation structure
- **Button Reordering** - Consistent action button placement across all skill analysis sections
- **Code Organization** - Improved skill management logic and UI component structure

## [1.5.0]

### Added
- **Skill Gap Analysis Persistence** - Skill analysis data now saves automatically and persists between sessions
- **Real-time Skill Synchronization** - Skills automatically update when resume profile changes across tabs
- **Info Tooltips for Skill Categories** - Added helpful definitions for Strong Match, Partial Match, and Missing Keywords
- **Skill Sorting** - All skill lists (Strong Match, Partial Match, Missing Keywords, Extracted Skills) now sorted alphabetically
- **Enhanced Skill Capitalization** - Skills displayed with proper title case (first letter of each word capitalized)
- **Duplicate Prevention** - Enhanced logic to prevent skill duplication when adding to resume

### Changed
- **Icon Standardization** - Replaced all emojis with consistent Lucide React icons throughout the application
- **Action Button Simplification** - Job view action buttons now show only icons with helpful tooltips
- **Toast Notifications** - Removed emojis from notifications for cleaner appearance
- **Skill Category Headers** - Added info icons with clear definitions for each skill match type
- **Partial Match Display** - Simplified partial match explanation to show only matched skills without verbose text

### Enhanced
- **Skill Analysis UI** - Better visual feedback and organization of skill categories
- **Button Tooltips** - Added hover tooltips for icon-only buttons to improve usability
- **Skill Management** - Improved skill handling with better state management and persistence

### Technical
- **LocalStorage Integration** - Skill analysis data stored in `openJobSkillAnalysis_[jobId]` keys
- **Event Synchronization** - Custom storage events for real-time updates across tabs
- **State Management** - Improved skill analysis state handling with immediate UI updates
- **Code Organization** - Better separation of skill analysis logic and UI components

## [1.4.1]

### Changed
- Sidebar: `Profile` renamed to `Resume Builder` with matching icon
- Routes: Removed deprecated standalone `ResumeBuilder` route/component; `ProfileEditor` is the unified builder
- Icons: Replaced Brain icons with Sparkles for AI Import (header and dialog)
- Job Tracker: Columns now auto-fit to screen width; removed horizontal scroll where possible

### Removed
- Job Tracker: `On Hold` status removed entirely from statuses, prompts, and autofill validation

### Fixed
- Header actions: Export now shows upload arrow; Import JSON shows download arrow consistently


All notable changes to JobM8 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0]

### Added
- **Professional Resume Builder** - Comprehensive resume creation system integrated into Profile Editor
  - Master Resumé tab with professionally formatted compiled view
  - Multiple professional resume templates (Modern, Classic, Creative, Minimal)
  - Template preview system with actual visual differences
  - Multi-format export: TXT, HTML, PDF with professional styling
  - Print-friendly CSS with proper margins and typography
  - Real-time preview with formatted and editable text views

- **Enhanced Resume Tailoring**
  - HTML formatted resume output with professional styling
  - Keyword highlighting in tailored resumes for better job matching
  - Visual job requirement analysis with keyword badges
  - Enhanced optimization suggestions with match percentage display
  - Multiple export formats for tailored resumes (TXT, HTML, PDF)
  - Improved visual feedback for keyword matching

### Changed
- **Profile Editor Restructured** - Now serves as the main Resume Builder interface
  - Projects tab renamed to "Master Resumé" with professional formatting
  - Enhanced visual organization with separator components
  - Improved contact information and professional summary display
  - Better date range formatting and experience presentation

- **Navigation Simplified** - Consolidated resume functionality
  - Profile route now serves as the primary Resume Builder
  - Removed redundant standalone Resume Builder component
  - Streamlined user workflow for resume creation

### Enhanced
- AI CV Import with improved Sparkles iconography for consistency
- Resume template system with distinct color schemes and styling
- Professional typography and spacing across all resume formats
- Cross-browser compatible print functionality
- ATS-friendly resume formatting

### Technical
- Consolidated Resume Builder architecture for better maintainability
- Professional HTML template generation with embedded CSS
- Improved component organization and code structure
- Enhanced export functionality with proper file naming
- Optimized performance with better state management

## [1.3.0]

### Added
- Job Tracker: View dialog to inspect a job by clicking the card (read-only, neat layout)
- Job Tracker: Drag-and-drop between status columns to change status
- Job Tracker: Wider, two-column Add Job dialog; Job URL at top; Remarks and Job Description grouped; Benefits moved after description

### Changed
- Job Tracker: Removed inline status action buttons; status changes rely on drag-and-drop
- Job Tracker: Removed Edit button; click opens the read-only inspector
- Job Tracker: Removed open-URL icon from cards (URL accessible in inspector)
- Job Tracker: Replaced Priority with multi-value Benefits field (chips with add/remove)
- Job Tracker: Column layout improved (scrollable board, consistent paddings)
- Job Tracker: Notes field relabeled to Job Description; fixed textarea to not auto-expand

### Fixed
- Status chips wrapping within cards to avoid overflow
- Dialog overflow with long job descriptions (scroll area and max heights)
- Prevent card click when pressing delete icon (no accidental inspector open)

### Technical
- LocalStorage schema updated for jobs: added `benefits: string[]`, kept backwards compatibility
- CSV export updated to include Benefits and Job Description columns

## [1.2.0]

### Added
- **AI-Powered CV Import Feature** - Automatically extract and parse existing CV/resume data using AI
  - Support for multiple file formats: PDF, DOC, DOCX, TXT, RTF, and Markdown (.md)
  - Intelligent data extraction for personal info, experience, education, and skills
  - Smart skills detection that extracts granular, specific skills instead of categories
  - Flexible date handling supporting both year-only (2023) and month-year (2023-01) formats
  - Comprehensive import analysis with feedback on successfully filled vs missing fields
  - Drag & drop file upload with validation and error handling

### Enhanced
- **Profile Editor** - Updated date inputs for Experience and Education to accept flexible formats
  - Changed from strict month inputs to text inputs accepting "2023" or "2023-01" formats
  - Added helpful placeholders to guide users on acceptable date formats
  - Improved comma-separated skills support in Skills section

- **AI Service** - Expanded with CV parsing capabilities
  - Added support for all AI providers: OpenAI, Gemini, Ollama, and Custom providers
  - Enhanced prompts for better data extraction accuracy
  - Improved error handling and response processing

### Fixed
- File type validation for Markdown files (browsers don't always set correct MIME types)
- Skills processing to handle various AI response formats and ensure deduplication
- Date normalization to preserve year-only dates when that's all that's available

### Technical
- Added new `AICVImport` component with comprehensive file handling
- Enhanced `AIService` class with CV parsing methods for all supported providers
- Improved gitignore to exclude development files (.claude/, CLAUDE.md)
- Updated project structure with better separation of concerns

## [1.1.0]

### Added
- Comma-separated skills support in Profile Editor
- Enhanced skills input with better user guidance

### Enhanced
- Skills section now accepts multiple skills separated by commas
- Improved placeholder text and descriptions for better UX

## [1.0.0]

### Added
- Initial release of JobM8 - AI-Powered Job Search Assistant
- Master Resume Repository for centralized professional information storage
- AI-Powered Resume Tailoring with job description analysis
- Job Application Tracker with Kanban-style workflow
- Cover Letter Generator with AI-powered personalization
- Document Vault for secure file storage
- Network Tracker for professional contact management
- Skill Gap Analyzer with learning recommendations
- Mock Interview Practice with AI feedback

### AI Provider Support
- OpenAI integration (GPT-4o, GPT-4o Mini, GPT-3.5 Turbo)
- Google Gemini support (Gemini 1.5 Pro, Gemini 1.5 Flash)
- Custom OpenAI-compatible API support
- Ollama local AI support (configurable)

### Core Features
- Privacy-first design with local data storage
- Optional data encryption for sensitive information
- Export/import functionality for data backup
- Modern, responsive user interface
- Comprehensive settings and configuration options
- Multi-theme support (light/dark mode)