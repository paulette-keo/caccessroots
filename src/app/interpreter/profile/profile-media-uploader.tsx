"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { INTERPRETER_PHOTO_BUCKET } from "@/lib/interpreter-photos";

type Props = {
  userId: string;
  fullName: string;
  currentPhotoPath: string | null;
  currentPhotoUrl: string | null;
};

const ALLOWED_PHOTO_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function ProfileMediaUploader({
  userId,
  fullName,
  currentPhotoPath,
  currentPhotoUrl,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [photoPath, setPhotoPath] = useState(currentPhotoPath ?? "");
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl ?? "");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadPhoto(file: File) {
    setError("");
    const extension = ALLOWED_PHOTO_TYPES.get(file.type);
    if (!extension) {
      setError("Profile photo must be a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    const path = `${userId}/photo-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(INTERPRETER_PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setError(`Could not upload photo: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    if (photoPath && photoPath !== currentPhotoPath) {
      await supabase.storage.from(INTERPRETER_PHOTO_BUCKET).remove([photoPath]);
    }
    setPhotoPath(path);
    setPhotoUrl(URL.createObjectURL(file));
    setRemovePhoto(false);
    setUploading(false);
  }

  async function removePendingPhoto() {
    setError("");
    if (photoPath && photoPath !== currentPhotoPath) {
      await supabase.storage.from(INTERPRETER_PHOTO_BUCKET).remove([photoPath]);
    }
    setPhotoPath("");
    setPhotoUrl("");
    setRemovePhoto(true);
  }

  return (
    <fieldset className="rounded-xl border border-slate-200 p-4 space-y-4">
      <legend className="px-2 text-sm font-medium">Profile photo</legend>
      <input type="hidden" name="profile_photo_path" value={photoPath} />
      <input type="hidden" name="remove_profile_photo" value={removePhoto ? "on" : ""} />

      {photoUrl && (
        <div className="flex items-center gap-3">
          <img
            src={photoUrl}
            alt={`${fullName} profile`}
            className="h-20 w-20 rounded-full border border-slate-200 object-cover"
          />
          <button
            type="button"
            onClick={() => void removePendingPhoto()}
            className="text-sm text-rose-600 underline"
          >
            Remove current photo
          </button>
        </div>
      )}

      <input
        id="profile_photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="input"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadPhoto(file);
        }}
      />
      <p className="text-xs text-ink-muted">JPG, PNG, or WebP. Maximum size 5 MB.</p>
      {uploading && <p className="text-sm text-brand-700">Uploading photo…</p>}
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </fieldset>
  );
}
