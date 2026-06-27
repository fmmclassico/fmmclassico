import { supabase } from './supabase';

export const supabaseNotifications = {
  async filter(userEmail, limit = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_date', { ascending: false })
      .limit(limit);
    if (error) { console.error('Supabase notifications fetch error:', error); return []; }
    return data || [];
  },

  async create(notification) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select();
    if (error) { console.error('Supabase notification create error:', error); return null; }
    return data?.[0] || null;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) { console.error('Supabase notification update error:', error); return null; }
    return data?.[0] || null;
  },

  async delete(id) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) { console.error('Supabase notification delete error:', error); return false; }
    return true;
  },

  async deleteMany(ids) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', ids);
    if (error) { console.error('Supabase notification bulk delete error:', error); return false; }
    return true;
  },

  async markAllRead(userEmail) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_email', userEmail)
      .eq('is_read', false);
    if (error) { console.error('Supabase mark all read error:', error); return false; }
    return true;
  },

  subscribe(userEmail, callback) {
    const channel = supabase
      .channel('notifications-' + userEmail)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_email=eq.${userEmail}`
      }, (payload) => {
        callback(payload);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }
};
