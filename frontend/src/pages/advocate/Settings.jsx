import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { advocateAPI } from '../../services/api';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Settings as SettingsIcon, User, Camera, Loader2, Check, X, Upload, Mail, Phone, MapPin, Briefcase, Award } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import '../../styles/advocate-dashboard.css';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [profile, setProfile] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Payment settings
  const [paymentSettings, setPaymentSettings] = useState({
    razorpay_key_id: '',
    razorpay_key_secret: ''
  });
  const [hasExistingSecret, setHasExistingSecret] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    bar_council_id: '',
    specializations: [],
    experience_years: 0,
    location: '',
    bio: '',
    profile_image_url: ''
  });

  const specializationOptions = [
    'Divorce',
    'Child Custody',
    'Adoption',
    'Domestic Violence',
    'Property Disputes',
    'Maintenance',
    'Other'
  ];

  useEffect(() => {
    loadProfile();
    loadPaymentSettings();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await advocateAPI.list();
      const myProfile = response.data.find(adv => adv.user_id === user.id);
      
      if (myProfile) {
        setProfile(myProfile);
        setFormData({
          full_name: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
          bar_council_id: myProfile.bar_council_id || '',
          specializations: myProfile.specializations || [],
          experience_years: myProfile.experience_years || 0,
          location: myProfile.location || '',
          bio: myProfile.bio || '',
          profile_image_url: user.profile_image_url || ''
        });
        if (user.profile_image_url) {
          setImagePreview(user.profile_image_url);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSettings = async () => {
    try {
        const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/payments/settings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.razorpay_key_id) {
        setPaymentSettings(prev => ({
          ...prev,
          razorpay_key_id: response.data.razorpay_key_id
        }));
      }
      setHasExistingSecret(response.data.has_secret);
    } catch (error) {
      console.error('Failed to load payment settings:', error);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadProfileImage = async () => {
    if (!profileImage) return formData.profile_image_url;

    try {
      setUploadingImage(true);
      
      const token = localStorage.getItem('token');
      const uploadFormData = new FormData();
      uploadFormData.append('file', profileImage);

      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/profile-image`,
        uploadFormData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data.image_url;
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.response?.data?.detail || "Failed to upload profile image",
        variant: "destructive"
      });
      return formData.profile_image_url;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Upload image first if there's a new one
      let imageUrl = formData.profile_image_url;
      if (profileImage) {
        imageUrl = await uploadProfileImage();
        if (!imageUrl) return;
      }

      // Update advocate profile
      if (profile?.id) {
        const updateData = {
          bar_council_id: formData.bar_council_id,
          specializations: formData.specializations,
          experience_years: parseInt(formData.experience_years),
          location: formData.location,
          bio: formData.bio
        };
        
        await axios.patch(
          `${process.env.REACT_APP_BACKEND_URL}/api/advocates/${profile.id}`,
          updateData,
           { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
      }

      // Save payment settings if changed
      if (paymentSettings.razorpay_key_id || paymentSettings.razorpay_key_secret) {
        const token = localStorage.getItem('token');
        await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/payments/settings`,
          paymentSettings,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      toast({
        title: "Profile Updated",
        description: "Your profile and payment settings have been updated successfully",
      });

      setProfileImage(null);
      setFormData({ ...formData, profile_image_url: imageUrl });
      setImagePreview(imageUrl);
      loadPaymentSettings();
      
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: error.response?.data?.detail || "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSpecializationToggle = (spec) => {
    if (formData.specializations.includes(spec)) {
      setFormData({
        ...formData,
        specializations: formData.specializations.filter(s => s !== spec)
      });
    } else {
      setFormData({
        ...formData,
        specializations: [...formData.specializations, spec]
      });
    }
  };

  if (loading) {
    return (
      <div className="advocate-dashboard">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
        <div className="adv-main">
          <DashboardHeader userName={user?.full_name} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="adv-content" style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <Loader2 className="animate-spin" size={48} color="#724AE3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="advocate-dashboard">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
      
      <div className="adv-main">
        <DashboardHeader userName={user?.full_name} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="adv-content" style={{ padding: '24px 28px' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0, marginBottom: 4 }}>
              Profile & Settings
            </h1>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
              Manage your professional profile and account settings
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Upload your professional photo</CardDescription>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{ position: 'relative', width: 180, height: 180 }}>
                    <img
                      src={imagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&size=180&background=724AE3&color=fff&font-size=0.4`}
                      alt="Profile"
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '4px solid #F5F3FF'
                      }}
                    />
                    <label
                      htmlFor="profile-image-input"
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#724AE3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                    >
                      <Camera size={20} color="#fff" />
                    </label>
                    <input
                      id="profile-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: '#888', textAlign: 'center', margin: 0 }}>
                    Accepted: JPG, PNG (max 5MB)
                  </p>
                </CardContent>
              </Card>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your basic details and contact information</CardDescription>
                </CardHeader>
                <CardContent style={{ display: 'grid', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#AAA' }} />
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          disabled
                          style={{ paddingLeft: 40 }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#AAA' }} />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          disabled
                          style={{ paddingLeft: 40 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#AAA' }} />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          style={{ paddingLeft: 40 }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <MapPin size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#AAA' }} />
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="e.g., kolkata"
                          style={{ paddingLeft: 40 }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Professional Information</CardTitle>
                  <CardDescription>Your legal practice details</CardDescription>
                </CardHeader>
                <CardContent style={{ display: 'grid', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <Label htmlFor="bar_council_id">Bar Council ID</Label>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <Award size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#AAA' }} />
                        <Input
                          id="bar_council_id"
                          value={formData.bar_council_id}
                          onChange={(e) => setFormData({ ...formData, bar_council_id: e.target.value })}
                          placeholder="e.g., 824072301"
                          style={{ paddingLeft: 40 }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="experience_years">Years of Experience</Label>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <Briefcase size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#AAA' }} />
                        <Input
                          id="experience_years"
                          type="number"
                          value={formData.experience_years}
                          onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                          min="0"
                          style={{ paddingLeft: 40 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Areas of Specialization</Label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                      {specializationOptions.map((spec) => (
                        <button
                          key={spec}
                          onClick={() => handleSpecializationToggle(spec)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 20,
                            border: formData.specializations.includes(spec) ? '2px solid #724AE3' : '1px solid #E0E0E0',
                            background: formData.specializations.includes(spec) ? '#F5F3FF' : '#fff',
                            color: formData.specializations.includes(spec) ? '#724AE3' : '#666',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {formData.specializations.includes(spec) && <Check size={14} style={{ marginRight: 4, display: 'inline' }} />}
                          {spec}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell clients about your experience and expertise..."
                      rows={4}
                      style={{ marginTop: 8 }}
                    />
                    <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                      {formData.bio.length} / 500 characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Settings</CardTitle>
                  <CardDescription>Configure Razorpay keys to receive payments from clients</CardDescription>
                </CardHeader>
                <CardContent style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <Label htmlFor="razorpay_key_id">Razorpay Key ID</Label>
                    <Input
                      id="razorpay_key_id"
                      value={paymentSettings.razorpay_key_id}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpay_key_id: e.target.value })}
                      placeholder="rzp_test_xxxxx or rzp_live_xxxxx"
                      style={{ marginTop: 8 }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="razorpay_key_secret">Razorpay Key Secret</Label>
                    <Input
                      id="razorpay_key_secret"
                      type="password"
                      value={paymentSettings.razorpay_key_secret}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpay_key_secret: e.target.value })}
                      placeholder={hasExistingSecret ? "••••••••" : "Enter your Razorpay secret key"}
                      style={{ marginTop: 8 }}
                    />
                    {hasExistingSecret && (
                      <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                        Leave blank to keep existing secret key
                      </p>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#666', background: '#F0EBF9', padding: 12, borderRadius: 8 }}>
                    <strong>Note:</strong> Get your Razorpay keys from the <a href="https://dashboard.razorpay.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#724AE3' }}>Razorpay Dashboard</a>. Use test keys for testing and live keys for production.
                  </p>
                </CardContent>
              </Card>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button
                  variant="outline"
                  onClick={loadProfile}
                  disabled={saving}
                >
                  <X size={16} style={{ marginRight: 8 }} />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ minWidth: 140 }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} style={{ marginRight: 8 }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} style={{ marginRight: 8 }} />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;