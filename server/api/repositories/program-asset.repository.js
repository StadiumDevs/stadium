import { supabase } from '../../db.js';

// Public Supabase Storage bucket holding admin-uploaded program imagery (cover
// banners, etc.). Created by the migration that adds it to storage.buckets.
const BUCKET = 'program-assets';

class ProgramAssetRepository {
  /** Upload a file to the public bucket (never overwrites) and return its public URL. */
  async uploadPublic(path, buffer, contentType) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}

export default new ProgramAssetRepository();
