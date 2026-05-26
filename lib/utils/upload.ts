// ============================================================
// lib/utils/upload.ts
// Reusable Supabase Storage upload helpers.
// Buckets:
//   - "member-docs"  → member photos & ID proofs (onboarding)
//   - "gym-assets"   → gym logos (requires "gym-assets" bucket in Supabase)
// ============================================================

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export type UploadBucket = "member-docs" | "gym-assets";

/**
 * Uploads a file to the given Supabase Storage bucket at the specified path.
 * Uses upsert: true so re-uploads always overwrite the previous file.
 * Returns the public URL on success, or throws on error.
 */
export async function uploadFile(
  bucket: UploadBucket,
  path: string,
  file: File
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Uploads an owner avatar to the "member-docs" bucket.
 * Path: avatars/[userId].[ext]
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  return uploadFile("member-docs", `avatars/${userId}.${ext}`, file);
}

/**
 * Uploads a gym logo to the "gym-assets" bucket.
 * Path: logos/[gymId].[ext]
 */
export async function uploadGymLogo(gymId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  return uploadFile("gym-assets", `logos/${gymId}.${ext}`, file);
}
