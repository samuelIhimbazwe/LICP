import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Slider } from '../components/ui/slider';
import { toast } from 'sonner';
import { copyToClipboard, downloadJsonFile, loadFromStorage, saveToStorage } from '../lib/ui-actions';
import {
  Settings,
  Palette,
  Layout,
  Globe,
  Zap,
  Eye,
  Moon,
  Sun,
  Monitor,
  Save,
  RotateCcw,
  Download,
  Upload
} from 'lucide-react';

export function UserPreferences() {
  const defaultPreferences = {
    // Appearance
    theme: 'light',
    accentColor: 'blue',
    fontSize: 'medium',
    compactMode: false,
    sidebarCollapsed: false,

    // Dashboard
    defaultView: 'dashboard',
    widgetLayout: 'grid',
    showQuickActions: true,
    refreshInterval: '30',

    // Language & Region
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    timezone: 'Africa/Kigali',
    currency: 'RWF',

    // Accessibility
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
    keyboardShortcuts: true,

    // Performance
    enableAnimations: true,
    lazyLoading: true,
    cacheData: true,
    preloadContent: true
  };

  const [preferences, setPreferences] = useState(defaultPreferences);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreferences(loadFromStorage('licp-user-preferences', defaultPreferences));
  }, []);

  const handlePreferenceChange = (key: string, value: string | boolean | number[]) => {
    setPreferences(prev => ({ ...prev, [key]: Array.isArray(value) ? value[0] : value }));
  };

  const handleSavePreferences = () => {
    saveToStorage('licp-user-preferences', preferences);
    toast.success('Preferences saved successfully');
  };

  const handleResetPreferences = () => {
    setPreferences(defaultPreferences);
    saveToStorage('licp-user-preferences', defaultPreferences);
    toast.info('Preferences reset to defaults');
  };

  const handleExportPreferences = () => {
    downloadJsonFile('licp-user-preferences.json', preferences);
    toast.success('Preferences exported successfully');
  };

  const handleImportPreferences = () => {
    importRef.current?.click();
  };

  const fontSizeLabels: { [key: string]: string } = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    xlarge: 'Extra Large'
  };

  return (
    <div className="p-6 space-y-6">
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const imported = JSON.parse(await file.text()) as typeof preferences;
            setPreferences({ ...defaultPreferences, ...imported });
            saveToStorage('licp-user-preferences', { ...defaultPreferences, ...imported });
            toast.success('Preferences imported successfully');
          } catch {
            toast.error('Invalid preferences file.');
          }
          e.target.value = '';
        }}
      />
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Preferences</h1>
          <p className="text-slate-600 mt-1">Customize your experience and interface settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetPreferences}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSavePreferences}>
            <Save className="mr-2 h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <Layout className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="localization">
            <Globe className="mr-2 h-4 w-4" />
            Localization
          </TabsTrigger>
          <TabsTrigger value="accessibility">
            <Eye className="mr-2 h-4 w-4" />
            Accessibility
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Zap className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme & Colors</CardTitle>
              <CardDescription>Customize the look and feel of your interface</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block">Theme Mode</Label>
                <RadioGroup value={preferences.theme} onValueChange={(value) => handlePreferenceChange('theme', value)}>
                  <div className="grid grid-cols-3 gap-4">
                    <label className="cursor-pointer">
                      <div className={`border-2 rounded-lg p-4 ${preferences.theme === 'light' ? 'border-brand bg-brand/5' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <RadioGroupItem value="light" id="theme-light" />
                          <Sun className="h-5 w-5" />
                        </div>
                        <p className="font-medium">Light</p>
                        <p className="text-sm text-slate-600">Bright and clean</p>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <div className={`border-2 rounded-lg p-4 ${preferences.theme === 'dark' ? 'border-brand bg-brand/5' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <RadioGroupItem value="dark" id="theme-dark" />
                          <Moon className="h-5 w-5" />
                        </div>
                        <p className="font-medium">Dark</p>
                        <p className="text-sm text-slate-600">Easy on the eyes</p>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <div className={`border-2 rounded-lg p-4 ${preferences.theme === 'auto' ? 'border-brand bg-brand/5' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <RadioGroupItem value="auto" id="theme-auto" />
                          <Monitor className="h-5 w-5" />
                        </div>
                        <p className="font-medium">Auto</p>
                        <p className="text-sm text-slate-600">Match system</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div>
                <Label htmlFor="accent-color">Accent Color</Label>
                <Select value={preferences.accentColor} onValueChange={(value) => handlePreferenceChange('accentColor', value)}>
                  <SelectTrigger id="accent-color" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Font Size: {fontSizeLabels[preferences.fontSize]}</Label>
                <div className="mt-4 px-2">
                  <div className="flex justify-between text-sm text-slate-600 mb-2">
                    <span>Small</span>
                    <span>Medium</span>
                    <span>Large</span>
                    <span>XL</span>
                  </div>
                  <Slider
                    value={[
                      preferences.fontSize === 'small' ? 0 :
                      preferences.fontSize === 'medium' ? 33 :
                      preferences.fontSize === 'large' ? 66 : 100
                    ]}
                    onValueChange={(value) => {
                      const size = value[0] < 25 ? 'small' : value[0] < 50 ? 'medium' : value[0] < 75 ? 'large' : 'xlarge';
                      handlePreferenceChange('fontSize', size);
                    }}
                    max={100}
                    step={33}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-slate-600">Reduce spacing for more content</p>
                  </div>
                  <Switch
                    checked={preferences.compactMode}
                    onCheckedChange={(checked) => handlePreferenceChange('compactMode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sidebar Collapsed by Default</Label>
                    <p className="text-sm text-slate-600">Start with sidebar minimized</p>
                  </div>
                  <Switch
                    checked={preferences.sidebarCollapsed}
                    onCheckedChange={(checked) => handlePreferenceChange('sidebarCollapsed', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Settings */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Layout</CardTitle>
              <CardDescription>Configure your dashboard appearance and behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="default-view">Default View on Login</Label>
                <Select value={preferences.defaultView} onValueChange={(value) => handlePreferenceChange('defaultView', value)}>
                  <SelectTrigger id="default-view" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="knowledge-base">Knowledge Base</SelectItem>
                    <SelectItem value="compliance-tracking">Compliance Tracking</SelectItem>
                    <SelectItem value="contracts">Contract Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="widget-layout">Widget Layout</Label>
                <Select value={preferences.widgetLayout} onValueChange={(value) => handlePreferenceChange('widgetLayout', value)}>
                  <SelectTrigger id="widget-layout" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="refresh-interval">Auto-Refresh Interval (seconds)</Label>
                <Select value={preferences.refreshInterval} onValueChange={(value) => handlePreferenceChange('refreshInterval', value)}>
                  <SelectTrigger id="refresh-interval" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="0">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Quick Actions</Label>
                  <p className="text-sm text-slate-600">Display quick action buttons on dashboard</p>
                </div>
                <Switch
                  checked={preferences.showQuickActions}
                  onCheckedChange={(checked) => handlePreferenceChange('showQuickActions', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Localization Settings */}
        <TabsContent value="localization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Language & Region</CardTitle>
              <CardDescription>Set your preferred language and regional formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={preferences.language} onValueChange={(value) => handlePreferenceChange('language', value)}>
                    <SelectTrigger id="language" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="rw">Kinyarwanda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={preferences.timezone} onValueChange={(value) => handlePreferenceChange('timezone', value)}>
                    <SelectTrigger id="timezone" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Kigali">Africa/Kigali (GMT+2)</SelectItem>
                      <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                      <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="date-format-pref">Date Format</Label>
                  <Select value={preferences.dateFormat} onValueChange={(value) => handlePreferenceChange('dateFormat', value)}>
                    <SelectTrigger id="date-format-pref" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="time-format">Time Format</Label>
                  <Select value={preferences.timeFormat} onValueChange={(value) => handlePreferenceChange('timeFormat', value)}>
                    <SelectTrigger id="time-format" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={preferences.currency} onValueChange={(value) => handlePreferenceChange('currency', value)}>
                  <SelectTrigger id="currency" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RWF">Rwandan Franc (RWF)</SelectItem>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessibility Settings */}
        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Options</CardTitle>
              <CardDescription>Configure accessibility features to improve usability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>High Contrast Mode</Label>
                    <p className="text-sm text-slate-600">Increase contrast for better visibility</p>
                  </div>
                  <Switch
                    checked={preferences.highContrast}
                    onCheckedChange={(checked) => handlePreferenceChange('highContrast', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reduce Motion</Label>
                    <p className="text-sm text-slate-600">Minimize animations and transitions</p>
                  </div>
                  <Switch
                    checked={preferences.reduceMotion}
                    onCheckedChange={(checked) => handlePreferenceChange('reduceMotion', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Screen Reader Support</Label>
                    <p className="text-sm text-slate-600">Enable enhanced screen reader compatibility</p>
                  </div>
                  <Switch
                    checked={preferences.screenReader}
                    onCheckedChange={(checked) => handlePreferenceChange('screenReader', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Keyboard Shortcuts</Label>
                    <p className="text-sm text-slate-600">Enable keyboard navigation shortcuts</p>
                  </div>
                  <Switch
                    checked={preferences.keyboardShortcuts}
                    onCheckedChange={(checked) => handlePreferenceChange('keyboardShortcuts', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="border rounded-lg p-4 bg-brand/5">
                <h4 className="font-medium mb-2">Common Keyboard Shortcuts</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Search:</span>
                    <kbd className="px-2 py-1 bg-white border rounded">Ctrl+K</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Dashboard:</span>
                    <kbd className="px-2 py-1 bg-white border rounded">Ctrl+H</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">New Contract:</span>
                    <kbd className="px-2 py-1 bg-white border rounded">Ctrl+N</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Help:</span>
                    <kbd className="px-2 py-1 bg-white border rounded">?</kbd>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Settings */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Settings</CardTitle>
              <CardDescription>Optimize application performance and data usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Animations</Label>
                    <p className="text-sm text-slate-600">Show smooth transitions and effects</p>
                  </div>
                  <Switch
                    checked={preferences.enableAnimations}
                    onCheckedChange={(checked) => handlePreferenceChange('enableAnimations', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Lazy Loading</Label>
                    <p className="text-sm text-slate-600">Load content as you scroll</p>
                  </div>
                  <Switch
                    checked={preferences.lazyLoading}
                    onCheckedChange={(checked) => handlePreferenceChange('lazyLoading', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cache Data</Label>
                    <p className="text-sm text-slate-600">Store frequently accessed data locally</p>
                  </div>
                  <Switch
                    checked={preferences.cacheData}
                    onCheckedChange={(checked) => handlePreferenceChange('cacheData', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Preload Content</Label>
                    <p className="text-sm text-slate-600">Load next pages in advance</p>
                  </div>
                  <Switch
                    checked={preferences.preloadContent}
                    onCheckedChange={(checked) => handlePreferenceChange('preloadContent', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Import/Export Preferences</CardTitle>
          <CardDescription>Save or restore your preference settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPreferences}>
              <Download className="mr-2 h-4 w-4" />
              Export Preferences
            </Button>
            <Button variant="outline" onClick={handleImportPreferences}>
              <Upload className="mr-2 h-4 w-4" />
              Import Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
