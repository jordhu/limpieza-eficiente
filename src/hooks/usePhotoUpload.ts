import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PENDING_PHOTOS_KEY = 'cleantrack_pending_photos';

interface PendingPhoto {
  id: string;
  entryId: string;
  type: 'start' | 'end';
  blob: string; // base64
  timestamp: string;
}

export function usePhotoUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  // Convert blob to base64 for offline storage
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Convert base64 back to blob
  const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Upload photo to Supabase storage
  const uploadPhoto = useCallback(async (
    blob: Blob,
    entryId: string,
    type: 'start' | 'end'
  ): Promise<string | null> => {
    if (!user) return null;

    const fileName = `${user.id}/${entryId}_${type}_${Date.now()}.jpg`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('verification-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      // Get the URL (not public, but we store the path)
      return fileName;
    } catch (err) {
      console.error('Error uploading photo:', err);
      return null;
    }
  }, [user]);

  // Save photo for offline sync
  const savePhotoOffline = useCallback(async (
    blob: Blob,
    entryId: string,
    type: 'start' | 'end'
  ) => {
    const base64 = await blobToBase64(blob);
    const pendingPhoto: PendingPhoto = {
      id: crypto.randomUUID(),
      entryId,
      type,
      blob: base64,
      timestamp: new Date().toISOString(),
    };

    const stored = localStorage.getItem(PENDING_PHOTOS_KEY);
    const pending: PendingPhoto[] = stored ? JSON.parse(stored) : [];
    pending.push(pendingPhoto);
    localStorage.setItem(PENDING_PHOTOS_KEY, JSON.stringify(pending));
    
    return pendingPhoto.id;
  }, []);

  // Sync pending photos when online
  const syncPendingPhotos = useCallback(async () => {
    if (!navigator.onLine || !user) return;

    const stored = localStorage.getItem(PENDING_PHOTOS_KEY);
    if (!stored) return;

    const pending: PendingPhoto[] = JSON.parse(stored);
    if (pending.length === 0) return;

    setUploading(true);
    const successfulIds: string[] = [];

    for (const photo of pending) {
      try {
        const blob = base64ToBlob(photo.blob);
        const photoUrl = await uploadPhoto(blob, photo.entryId, photo.type);
        
        if (photoUrl) {
          // Update time entry with photo URL
          const column = photo.type === 'start' ? 'start_photo_url' : 'end_photo_url';
          await supabase
            .from('time_entries')
            .update({ [column]: photoUrl })
            .eq('id', photo.entryId);
          
          successfulIds.push(photo.id);
        }
      } catch (err) {
        console.error('Error syncing photo:', err);
      }
    }

    if (successfulIds.length > 0) {
      const remaining = pending.filter(p => !successfulIds.includes(p.id));
      localStorage.setItem(PENDING_PHOTOS_KEY, JSON.stringify(remaining));
    }

    setUploading(false);
    return successfulIds.length;
  }, [user, uploadPhoto]);

  // Upload photo immediately or save for later
  const handlePhotoCapture = useCallback(async (
    blob: Blob,
    entryId: string,
    type: 'start' | 'end'
  ): Promise<{ success: boolean; photoUrl?: string; offline?: boolean }> => {
    if (!user) return { success: false };

    if (navigator.onLine) {
      setUploading(true);
      const photoUrl = await uploadPhoto(blob, entryId, type);
      setUploading(false);
      
      if (photoUrl) {
        return { success: true, photoUrl };
      }
      
      // If upload failed, save offline
      await savePhotoOffline(blob, entryId, type);
      return { success: true, offline: true };
    } else {
      await savePhotoOffline(blob, entryId, type);
      return { success: true, offline: true };
    }
  }, [user, uploadPhoto, savePhotoOffline]);

  // Get count of pending photos
  const getPendingPhotosCount = useCallback((): number => {
    const stored = localStorage.getItem(PENDING_PHOTOS_KEY);
    if (!stored) return 0;
    return JSON.parse(stored).length;
  }, []);

  return {
    uploading,
    handlePhotoCapture,
    syncPendingPhotos,
    getPendingPhotosCount,
    uploadPhoto,
  };
}
