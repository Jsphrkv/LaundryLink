import supabase from './supabase';
import { User, UserRole } from '../types';

export const authService = {
  async signUp(email: string, password: string, fullName: string, phone: string, role: UserRole) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, role } },
    });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        phone,
        role,
        is_verified: false,
      });
      if (profileError) throw profileError;
      await createRoleProfile(data.user.id, role);
    }
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async getCurrentUser(): Promise<User | null> {
    const session = await authService.getSession();
    if (!session) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (error) return null;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  // Upload avatar to Supabase Storage
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext  = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  },
};

async function createRoleProfile(userId: string, role: UserRole) {
  if (role === 'customer') {
    await supabase.from('customer_profiles').insert({ user_id: userId, total_orders: 0, loyalty_points: 0 });
  } else if (role === 'rider') {
    await supabase.from('rider_profiles').insert({
      user_id: userId, status: 'offline', rating: 5.0, total_deliveries: 0, is_kyc_verified: false,
    });
  } else if (role === 'shop_owner') {
    await supabase.from('shop_profiles').insert({
      user_id: userId, shop_name: '', address: '', lat: 0, lng: 0,
      phone: '', rating: 5.0, total_reviews: 0, is_open: false, is_verified: false,
    });
  }
}
