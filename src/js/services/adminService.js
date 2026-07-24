import { supabaseClient } from "../config/supabase.js";

const PROFILES_TABLE = "profiles";
const PROPERTIES_TABLE = "properties";
const ADMIN_ROLE_NAME = "admin";
const USERS_SELECT = `
  user_id,
  display_name,
  phone,
  avatar_url,
  created_at,
  updated_at,
  user_roles (
    role_id,
    assigned_at,
    roles (
      role_id,
      role_name,
      description
    )
  )
`;
const PROPERTIES_SELECT = `
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

async function getAuthenticatedUserIdOrThrow(client) {
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  const userId = data?.user?.id;

  if (!userId) {
    throw new Error("You must be logged in to perform admin operations.");
  }

  return userId;
}

async function ensureAdminOrThrow(client) {
  const userId = await getAuthenticatedUserIdOrThrow(client);
  const { data, error } = await client
    .from("user_roles")
    .select("role_id, roles!inner(role_name)")
    .eq("user_id", userId)
    .eq("roles.role_name", ADMIN_ROLE_NAME)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Admin permissions are required.");
  }

  return userId;
}

function createUsersQuery(client) {
  return client
    .from(PROFILES_TABLE)
    .select(USERS_SELECT);
}

function createPropertiesQuery(client) {
  return client
    .from(PROPERTIES_TABLE)
    .select(PROPERTIES_SELECT);
}

export async function getAllUsers() {
  try {
    const client = getClientOrThrow();
    await ensureAdminOrThrow(client);
    const { data, error } = await createUsersQuery(client)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return buildSuccessResult(data || []);
  } catch (error) {
    return buildErrorResult("Fetch users", error, []);
  }
}

export async function deleteUser(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    const client = getClientOrThrow();
    await ensureAdminOrThrow(client);
    const { error } = await client
      .from(PROFILES_TABLE)
      .delete()
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return {
      data: true,
      error: null
    };
  } catch (error) {
    return buildErrorResult("Delete user", error, false);
  }
}

export async function getAllProperties() {
  try {
    const client = getClientOrThrow();
    await ensureAdminOrThrow(client);
    const { data, error } = await createPropertiesQuery(client)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return buildSuccessResult(data || []);
  } catch (error) {
    return buildErrorResult("Fetch all properties", error, []);
  }
}

export async function deleteAnyProperty(propertyId) {
  try {
    if (!propertyId) {
      throw new Error("Property ID is required.");
    }

    const client = getClientOrThrow();
    await ensureAdminOrThrow(client);
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