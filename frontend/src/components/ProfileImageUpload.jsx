import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Camera, Upload, X, Loader2, User } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ProfileImageUpload = ({ 
  currentImageUrl, 
  userName, 
  userId,
  onImageUpdate 
}) => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(
        `${BACKEND_URL}/api/users/profile-image`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast({
        title: "Success",
        description: "Profile image updated successfully"
      });

      // Call parent callback to update image
      if (onImageUpdate) {
        onImageUpdate(response.data.image_url);
      }

      // Reset and close
      setPreview(null);
      setSelectedFile(null);
      setShowDialog(false);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.response?.data?.detail || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${BACKEND_URL}/api/users/profile-image`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      toast({
        title: "Success",
        description: "Profile image removed"
      });

      if (onImageUpdate) {
        onImageUpdate(null);
      }

      setShowDialog(false);

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to remove image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length > 1 
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Avatar with Edit Button */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Avatar 
          style={{ width: 80, height: 80, cursor: 'pointer' }}
          onClick={() => setShowDialog(true)}
        >
          <AvatarImage src={currentImageUrl} alt={userName} />
          <AvatarFallback style={{ 
            background: 'linear-gradient(135deg, #815DF5, #6B45E0)',
            color: '#fff',
            fontSize: 24,
            fontWeight: 600
          }}>
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => setShowDialog(true)}
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#815DF5',
            border: '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <Camera size={14} color="#fff" />
        </button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Picture</DialogTitle>
            <DialogDescription>
              Upload a new profile picture or remove the current one
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', padding: '20px 0' }}>
            {/* Current/Preview Image */}
            <Avatar style={{ width: 120, height: 120 }}>
              <AvatarImage src={preview || currentImageUrl} alt={userName} />
              <AvatarFallback style={{ 
                background: 'linear-gradient(135deg, #815DF5, #6B45E0)',
                color: '#fff',
                fontSize: 36,
                fontWeight: 600
              }}>
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>

            {/* File Input (Hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              {!preview ? (
                <>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                    style={{ background: '#815DF5', color: '#fff' }}
                  >
                    <Upload size={16} style={{ marginRight: 8 }} />
                    Choose New Image
                  </Button>

                  {currentImageUrl && (
                    <Button
                      variant="outline"
                      onClick={handleRemoveImage}
                      disabled={uploading}
                      className="w-full"
                      style={{ borderColor: '#EF4444', color: '#EF4444' }}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <X size={16} style={{ marginRight: 8 }} />
                          Remove Image
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full"
                    style={{ background: '#10B981', color: '#fff' }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} style={{ marginRight: 8 }} />
                        Upload Image
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreview(null);
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={uploading}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

            {/* Info */}
            <p style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>
              Supported formats: JPG, PNG, GIF (Max 5MB)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileImageUpload;
