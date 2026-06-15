import { randomUUID } from 'node:crypto';
import { supabase } from '../../db.js';

// Public Supabase Storage bucket holding admin-uploaded program imagery (cover
// banners, etc.). Created by the migration that adds it to storage.buckets.
const BUCKET = 'program-assets';

// Image types we accept for a cover upload, mapped to a file extension. Anything
// else is rejected by the controller before we ever touch storage.
const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const ALLOWED_IMAGE_MIME = Object.keys(EXT_BY_MIME);
export const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5MB

class ProgramAssetService {
  /** True when the mime type is one we allow for an image upload. */
  isAllowedImageMime(mime) {
    return Object.prototype.hasOwnProperty.call(EXT_BY_MIME, mime);
  }

  /**
   * Upload a cover image buffer to the public program-assets bucket and return
   * its public URL. Caller (controller) is responsible for validating mime/size
   * first. The path is namespaced by program id with a random suffix so repeated
   * uploads never collide or overwrite each other.
   */
  async uploadCover({ programId, buffer, contentType }) {
    const ext = EXT_BY_MIME[contentType] || 'png';
    const path = `${programId}/cover-${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}

export default new ProgramAssetService();
