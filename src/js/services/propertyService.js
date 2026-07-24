import { supabaseClient } from "../config/supabase.js";

const PROPERTIES_TABLE = "properties";
const DEFAULT_SELECT = `
  property_id,
  owner_user_id,
  property_type_id,
  status_id,
  location_id,
  title,
  description,
  price_amount,
  currency_code,
  bedrooms,
  bathrooms,
  parking_spaces,
  area_value,
  area_unit,
  year_built,
  created_at,
  updated_at,
  published_at,
  profiles!properties_owner_user_id_fkey (
    user_id,
    display_name,
    phone,
    avatar_url
  ),
  locations (*),
  property_types (*),
  listing_statuses (*),
  property_images (*),
  property_amenities (
    amenity_id,
    amenities (*)
  )
`;

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

function buildSuccessResult(data) {
  return {
    data,
    error: null
  };
}

function buildErrorResult(action, error, fallbackData) {
  return {
    data: fallbackData,
    error: buildErrorMessage(action, error)
  };
}

function createPropertiesQuery(client) {
  return client
    .from(PROPERTIES_TABLE)
    .select(DEFAULT_SELECT);
}

export async function getAllProperties() {
  try {
    const client = getClientOrThrow();
    const { data, error } = await createPropertiesQuery(client)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return buildSuccessResult(data || []);
  } catch (error) {
    return buildErrorResult("Fetch properties", error, []);
  }
}

export async function getPropertyById(propertyId) {
  try {
    if (!propertyId) {
      throw new Error("Property ID is required.");
    }

    const client = getClientOrThrow();
    const { data, error } = await createPropertiesQuery(client)
      .eq("property_id", propertyId)
      .single();

    if (error) {
      throw error;
    }

    return buildSuccessResult(data || null);
  } catch (error) {
    return buildErrorResult("Fetch property", error, null);
  }
}

export async function createProperty(propertyData) {
  try {
    if (!propertyData || typeof propertyData !== "object") {
      throw new Error("Property data is required.");
    }

    const client = getClientOrThrow();
    const { data, error } = await client
      .from(PROPERTIES_TABLE)
      .insert(propertyData)
      .select(DEFAULT_SELECT)
      .single();

    if (error) {
      throw error;
    }

    return buildSuccessResult(data || null);
  } catch (error) {
    return buildErrorResult("Create property", error, null);
  }
}

export async function updateProperty(propertyId, updates) {
  try {
    if (!propertyId) {
      throw new Error("Property ID is required.");
    }

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      throw new Error("Valid property updates are required.");
    }

    const client = getClientOrThrow();
    const { data, error } = await client
      .from(PROPERTIES_TABLE)
      .update(updates)
      .eq("property_id", propertyId)
      .select(DEFAULT_SELECT)
      .single();

    if (error) {
      throw error;
    }

    return buildSuccessResult(data || null);
  } catch (error) {
    return buildErrorResult("Update property", error, null);
  }
}

export async function deleteProperty(propertyId) {
  try {
    if (!propertyId) {
      throw new Error("Property ID is required.");
    }

    const client = getClientOrThrow();
    const { error } = await client
      .from(PROPERTIES_TABLE)
      .delete()
      .eq("property_id", propertyId);

    if (error) {
      throw error;
    }

    return {
      data: true,
      error: null
    };
  } catch (error) {
    return buildErrorResult("Delete property", error, false);
  }
}

export async function getLatestProperties(limit = 6) {
  try {
    const client = getClientOrThrow();
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 6;
    const { data, error } = await createPropertiesQuery(client)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw error;
    }

    return buildSuccessResult(data || []);
  } catch (error) {
    return buildErrorResult("Fetch latest properties", error, []);
  }
}

export async function getPropertiesByOwner(ownerUserId) {
  try {
    if (!ownerUserId) {
      throw new Error("Owner user ID is required.");
    }

    const client = getClientOrThrow();
    const { data, error } = await createPropertiesQuery(client)
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return buildSuccessResult(data || []);
  } catch (error) {
    return buildErrorResult("Fetch owner properties", error, []);
  }
}
