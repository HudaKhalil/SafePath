'use client';

import { useState, useRef } from 'react';

export default function ImageUpload({ 
  currentImage, 
  onUpload, 
  onDelete, 
  isDark = false,
  editing = false,
  maxSize = 5, // MB
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Use currentImage as the preview source
  const displayImage = preview || currentImage;

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError(`Invalid file type. Accepted: ${acceptedFormats.join(', ')}`);
      return;
    }

    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size: ${maxSize}MB`);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const result = await onUpload(file);
      if (result.success) {
        // Preview already set from FileReader above
        // Backend will return the new image path in result.data.profile_picture
      } else {
        setError(result.message || 'Upload failed');
        setPreview(null); // Reset to use currentImage
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
      setPreview(null); // Reset to use currentImage
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this picture?')) return;

    setUploading(true);
    setError('');
    try {
      const result = await onDelete();
      if (result.success) {
        setPreview(null);
      } else {
        setError(result.message || 'Delete failed');
      }
    } catch (err) {
      setError(err.message || 'Delete failed');
    } finally {
      setUploading(false);
    }
  };

  // Construct full image URL for backend images
  const getImageUrl = () => {
    const img = displayImage;
    
    if (!img) return null;
    
    // If it's a data URL (base64 preview), use it directly
    if (img.startsWith('data:')) {
      return img;
    }
    
    // If it's already a full URL (Cloudinary or other CDN), use it
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    
    // Otherwise, construct the full URL to backend for local files
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    const baseUrl = apiUrl.replace(/\/api$/, '');
    return `${baseUrl}${img}`;
  };

  const imageUrl = getImageUrl();

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Image Preview */}
      <div className="relative">
        <div 
          className="w-32 h-32 rounded-full overflow-hidden border-4 flex items-center justify-center"
          style={{ 
            borderColor: isDark ? '#06d6a0' : '#059669',
            backgroundColor: isDark ? '#334155' : '#e5e7eb'
          }}
        >
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide broken image and show placeholder instead
                e.target.style.display = 'none';
                // Set error message only once
                if (!error) {
                  setError('Profile picture not found');
                }
              }}
            />
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              className="w-16 h-16"
              style={{ color: isDark ? '#475569' : '#94a3b8' }}
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          )}
        </div>

        {/* Loading spinner */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Upload/Delete buttons below image - only shown in edit mode */}
      {!uploading && editing && (
        <div className="flex items-center gap-3 w-full">
          {/* Buttons on the left */}
          <div className="flex gap-2">
            <div className="relative group">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
                style={{ 
                  backgroundColor: isDark ? '#06d6a0' : '#06d6a0',
                  color: isDark ? '#0f172a' : '#0f172a',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#06d6a0';
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className="w-3.5 h-3.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </button>
              <span 
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#0f172a',
                  color: '#ffffff'
                }}
              >
                Upload picture
              </span>
            </div>

            {imageUrl && (
              <div className="relative group">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
                  style={{ 
                    backgroundColor: isDark ? '#06d6a0' : '#06d6a0',
                    color: isDark ? '#0f172a' : '#0f172a',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#059669';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#06d6a0';
                  }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    className="w-3.5 h-3.5"
                  >
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
                <span 
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#0f172a',
                    color: '#ffffff'
                  }}
                >
                  Delete picture
                </span>
              </div>
            )}
          </div>

          {/* Info text on the right */}
          <p className="text-sm flex-1" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
            Max {maxSize}MB • JPEG, PNG, GIF, WebP
          </p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm w-full">
          {error}
        </div>
      )}
    </div>
  );
}
