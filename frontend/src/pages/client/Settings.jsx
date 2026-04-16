import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { User, Bell, Shield, Globe, Moon, Sun, Loader2, Save, CheckCircle, Mail, Phone } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const Settings = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: ''
  });
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    push_notifications: true,
    case_updates: true,
    meeting_reminders: true,
    document_uploads: true,
    advocate_messages: true
  });
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await dashboardAPI.getUserProfile();
      setProfile({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        role: response.data.role || ''
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dashboardAPI.updateUserProfile({
        full_name: profile.full_name,
        phone: profile.phone
      });
      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: error.response?.data?.detail || "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = (key) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
    toast({ title: "Settings Updated", description: "Notification preferences saved" });
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    toast({ title: "Theme Changed", description: `Switched to ${newTheme} mode` });
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    toast({ title: "Language Changed", description: "Language preferences saved" });
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="settings-page">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-violet-600" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User size={16} className="mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell size={16} className="mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" data-testid="tab-appearance">
            <Sun size={16} className="mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield size={16} className="mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Profile Information</h3>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{profile.full_name}</h4>
                  <Badge className="mt-1">{profile.role}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Enter your full name"
                    data-testid="input-full-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="bg-slate-100"
                    data-testid="input-email"
                  />
                  <p className="text-xs text-slate-500">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91-XXXXXXXXXX"
                    data-testid="input-phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={profile.role}
                    disabled
                    className="bg-slate-100"
                    data-testid="input-role"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700" data-testid="save-profile-btn">
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Notification Preferences</h3>
            <div className="space-y-6">
              {[
                { key: 'email_notifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                { key: 'push_notifications', label: 'Push Notifications', description: 'Receive push notifications in browser' },
                { key: 'case_updates', label: 'Case Updates', description: 'Notify me about case progress and updates' },
                { key: 'meeting_reminders', label: 'Meeting Reminders', description: 'Send reminders before scheduled meetings' },
                { key: 'document_uploads', label: 'Document Uploads', description: 'Notify when new documents are uploaded' },
                { key: 'advocate_messages', label: 'Advocate Messages', description: 'Notify about messages from your advocate' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg" data-testid={`notification-${item.key}`}>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{item.label}</h4>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications[item.key] ? 'bg-violet-600' : 'bg-slate-300'
                    }`}
                    onClick={() => handleNotificationChange(item.key)}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Appearance Settings</h3>
            <div className="space-y-6">
              {/* Theme */}
              <div>
                <Label className="mb-3 block">Theme</Label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon }
                  ].map((themeOption) => (
                    <button
                      key={themeOption.value}
                      type="button"
                      className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                        theme === themeOption.value
                          ? 'border-violet-600 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => handleThemeChange(themeOption.value)}
                      data-testid={`theme-${themeOption.value}`}
                    >
                      <themeOption.icon size={20} className={theme === themeOption.value ? 'text-violet-600' : 'text-slate-600'} />
                      <span className="font-medium text-slate-900">{themeOption.label}</span>
                      {theme === themeOption.value && <CheckCircle size={16} className="ml-auto text-violet-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <Label className="mb-3 block">Language</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'en', label: 'English' },
                    { value: 'hi', label: 'हिंदी' },
                    { value: 'bn', label: 'বাংলা' }
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      className={`p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                        language === lang.value
                          ? 'border-violet-600 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => handleLanguageChange(lang.value)}
                      data-testid={`language-${lang.value}`}
                    >
                      <Globe size={18} className={language === lang.value ? 'text-violet-600' : 'text-slate-600'} />
                      <span className="font-medium text-slate-900">{lang.label}</span>
                      {language === lang.value && <CheckCircle size={16} className="text-violet-600" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Security Settings</h3>
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="text-amber-600 mt-1" size={20} />
                  <div>
                    <h4 className="font-medium text-amber-900 mb-1">Password Management</h4>
                    <p className="text-sm text-amber-700 mb-3">
                      Your account is secured with Supabase authentication. To change your password, please use the password reset option.
                    </p>
                    <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                      Reset Password
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-3">Account Actions</h4>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={logout} data-testid="logout-btn">
                    Logout from this device
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50">
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
