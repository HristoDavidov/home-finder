import { supabaseClient } from "../config/supabase.js";

const PROPERTY_IMAGES_BUCKET = "property-images";

function getClientOrThrow() {
  if (!supabaseClient) {
    throw new Error(
      "Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }

  return supabaseClient;
}

function buildErrorMessage(action, error) {
  if (error && typeof error.message === "string" && error.message.trim()) {
    return `${action} failed: ${error.message}`;
  }

  return `${action} failed. Please try again.`;
}

function buildFilePath(fileName, folder = "properties") {
  const safeFolder = String(folder || "properties").trim().replace(/^\/+|\/+$/g, "");
  const safeFileName = String(fileName || "file")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  return `${safeFolder}/${Date.now()}-${safeFileName}`;
}

export async function uploadPropertyImage(file, folder = "properties") {
  try {
    if (!file) {
      throw new Error("Image file is required.");
    }

    const client = getClientOrThrow();
    const filePath = buildFilePath(file.name, folder);
    const { error } = await client.storage
      .from(PROPERTY_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) {
      throw error;
    }

    const urlResult = await getImageUrl(filePath);

    if (urlResult.error) {
      throw new Error(urlResult.error);
    }

    return {
      data: {
        bucket: PROPERTY_IMAGES_BUCKET,
        path: filePath,
        publicUrl: urlResult.data
      },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: buildErrorMessage("Upload property image", error)
    };
  }
}

export async function deleteImage(filePath) {
  try {
    if (!filePath) {
      throw new Error("Image path is required.");
    }

    const client = getClientOrThrow();
    const { error } = await client.storage
      .from(PROPERTY_IMAGES_BUCKET)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return {
      data: true,
      error: null
    };
  } catch (error) {
    return {
      data: false,
      error: buildErrorMessage("Delete image", error)
    };
  }
}

export async function getImageUrl(filePath) {
  try {
    if (!filePath) {
      throw new Error("Image path is required.");
    }

    const client = getClientOrThrow();
    const { data } = client.storage
      .from(PROPERTY_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("Public URL could not be generated.");
    }

    return {
      data: data.publicUrl,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: buildErrorMessage("Get image URL", error)
    };
  }
}
