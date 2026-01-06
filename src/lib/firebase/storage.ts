/**
 * Numia v1.0 - Firebase Storage Operations
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

/**
 * Upload entity logo to Firebase Storage
 * @param file - Image file to upload
 * @param userId - User ID
 * @param entityId - Entity ID
 * @returns Download URL of uploaded image
 */
export async function uploadEntityLogo(
  file: File,
  userId: string,
  entityId: string
): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('La imagen no debe superar 2MB');
  }

  // Create storage reference
  const storageRef = ref(storage, `entities/${userId}/${entityId}/logo.${file.name.split('.').pop()}`);

  // Upload file
  await uploadBytes(storageRef, file);

  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

/**
 * Delete entity logo from Firebase Storage
 * @param logoUrl - URL of the logo to delete
 */
export async function deleteEntityLogo(logoUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, logoUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting logo:', error);
    // Don't throw error if logo doesn't exist
  }
}
