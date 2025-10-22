import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  FileText, 
  Briefcase, 
  Users, 
  FolderOpen, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Moon,
  Sun,
  Mic
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const navigationItems = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/profile', icon: FileText, label: 'Resume Builder' },
  { path: '/job-tracker', icon: Briefcase, label: 'Job Tracker' },
  { path: '/network-tracker', icon: Users, label: 'Network Tracker' },
  { path: '/documents', icon: FolderOpen, label: 'Document Vault' },
  { path: '/settings', icon: Settings, label: 'Settings' }
]

export function Sidebar({ collapsed, onToggle, darkMode, onToggleDarkMode }) {
  const location = useLocation()

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path
    const Icon = item.icon
    const isDisabled = item.disabled

    const buttonElement = (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        disabled={isDisabled}
        className={`w-full justify-start gap-3 h-12 ${
          collapsed ? 'px-3' : 'px-4'
        } ${isActive ? 'bg-accent text-accent-foreground' : ''} ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Button>
    )

    const content = isDisabled ? buttonElement : (
      <Link to={item.path}>
        {buttonElement}
      </Link>
    )

    if (collapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.label}{item.disabled ? ' (Disabled)' : ''}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return content
  }

  return (
    <div className={`fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-lg text-sidebar-foreground">JobM8</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-sidebar-border">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleDarkMode}
                  className={`w-full h-12 ${collapsed ? 'px-3' : 'px-4 justify-start gap-3'}`}
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  <p>{darkMode ? 'Light Mode' : 'Dark Mode'}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}

