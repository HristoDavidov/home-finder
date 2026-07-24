import { supabaseClient } from "../config/supabase.js";

const FAVORITES_TABLE = "favorites";
const FAVORITE_SELECT = `
  user_id,
  property_id,
  created_at,
  updated_at,
  properties (
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
    throw new Error("You must be logged in to manage favorites.");
  }

  return userId;
}

function createFavoritesQuery(client) {
  return client
    .from(FAVORITES_TABLE)
    .select(FAVORITE_SELECT);
}

export async function addFavorite(propertyId) {
  try {
    if (!propertyId) {
      throw new Error("Property ID is required.");
    }

    const client = getClientOrThrow();
    const userId = await getAuthenticatedUserIdOrThrow(client);
    const { data, error } = await client
      .from(FAVORITES_TABLE)
      .upsert(
        {
          user_id: userId,
          property_id: propertyId
        },
        {
          onConflict: "user_id,property_id"
        }
      )
      .select(FAVORITE_SELECT)
      .single();

    if (error) {
      throw error;
    }

    return buildSuccessResult(data || null);
  } catch (error) {
    return buildErrorResult("Add favorite", error, null);
  }
}

export async function removeFavorite(propertyId) {
  try {
    if (!propertyId) {
      throw new Error("Property ID is required.");
    }

    const client = getClientOrThrow();
    const userId = await getAuthenticatedUserIdOrThrow(client);
    const { error } = await client
      .from(FAVORITES_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("property_id", propertyId);

    if (error) {
      throw error;
    }

    return {
      data: true,
      error: null
    };
  } catch (error) {
    return buildErrorResult("Remove favorite", error, false);
  }
}

export async function getFavorites() {
  try {
    const client = getClientOrThrow();
    const userId = await getAuthenticatedUserIdOrThrow(client);
    const { data, error } = await createFavoritesQuery(client)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return buildSuccessResult(data || []);
  } catch (error) {
    return buildErrorResult("Fetch favorites", error, []);
  }
}

export async function isFavorite(propertyId) {
  try {
    if (!propertyId) {
      throw new Error("Property ID is required.");
    }

    const client = getClientOrThrow();
    const userId = await getAuthenticatedUserIdOrThrow(client);
    const { data, error } = await client
      .from(FAVORITES_TABLE)
      .select("property_id")
      .eq("user_id", userId)
      .eq("property_id", propertyId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return buildSuccessResult(Boolean(data));
  } catch (error) {
    return buildErrorResult("Check favorite", error, false);
  }
}