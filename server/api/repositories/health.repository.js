import { supabase } from '../../db.js';

// Connectivity probe for GET /api/health/db (Railway → Supabase).
class HealthRepository {
  /** Count projects without fetching rows. Returns Supabase's `{ count, error }`. */
  async countProjects() {
    const { count, error } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    return { count, error };
  }
}

export default new HealthRepository();
