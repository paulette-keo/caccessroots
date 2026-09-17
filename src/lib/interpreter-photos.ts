import type { SupabaseClient } from "@supabase/supabase-js";

export const INTERPRETER_PHOTO_BUCKET =
  "interpreter-profile-photos";

async function createInterpreterMediaUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string | null | undefined
) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    console.error(
      "Could not create interpreter media URL:",
      error
    );
    return null;
  }

  return data.signedUrl;
}

export async function createInterpreterPhotoUrl(
  supabase: SupabaseClient,
  path: string | null | undefined
) {
  return createInterpreterMediaUrl(
    supabase,
    INTERPRETER_PHOTO_BUCKET,
    path
  );
}
