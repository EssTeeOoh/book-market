'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type ProfileSetupState = { error?: string };

export async function completeProfile(_previousState: ProfileSetupState, formData: FormData): Promise<ProfileSetupState> {
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const firstName = String(formData.get('first_name') ?? '').trim();
  const lastName = String(formData.get('last_name') ?? '').trim();
  const displayName = String(formData.get('display_name') ?? '').trim();
  const wantsToSell = formData.get('account_type') === 'seller';
  const gender = String(formData.get('gender') ?? '').trim() || null;
  const dateOfBirth = String(formData.get('date_of_birth') ?? '').trim() || null;

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return { error: 'Username must be 3 to 24 characters using lowercase letters, numbers, or underscores.' };
  }
  if (!firstName || !lastName) return { error: 'First name and last name are required.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const avatar = formData.get('avatar');
  let avatarUrl: string | null = null;
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith('image/') || avatar.size > 5 * 1024 * 1024) return { error: 'Please choose an image smaller than 5 MB.' };
    const extension = avatar.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatar, { contentType: avatar.type, upsert: false });
    if (uploadError) return { error: `Avatar upload failed: ${uploadError.message}` };
    avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.rpc('update_my_profile', {
    p_username: username,
    p_first_name: firstName,
    p_last_name: lastName,
    p_display_name: displayName || null,
    p_role: wantsToSell ? 'seller' : 'customer',
    p_gender: gender,
    p_date_of_birth: dateOfBirth,
    p_avatar_url: avatarUrl,
  });

  if (error) return { error: error.message };
  redirect('/');
}
