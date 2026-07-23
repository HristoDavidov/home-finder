import { supabaseClient } from "../config/supabase.js";

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

export async function register({ email, password, metadata = {} }) {
  try {
    if (!email || !password) {
      throw new Error("Email and password are required for registration.");
    }

    const client = getClientOrThrow();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });

    if (error) {
      throw error;
    }

    return {
      user: data?.user || null,
      session: data?.session || null,
      error: null
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: buildErrorMessage("Registration", error)
    };
  }
}

export async function login({ email, password }) {
  try {
    if (!email || !password) {
      throw new Error("Email and password are required for login.");
    }

    const client = getClientOrThrow();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return {
      user: data?.user || null,
      session: data?.session || null,
      error: null
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: buildErrorMessage("Login", error)
    };
  }
}

export async function logout() {
  try {
    const client = getClientOrThrow();
    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }

    return {
      success: true,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: buildErrorMessage("Logout", error)
    };
  }
}

export async function getCurrentUser() {
  try {
    const client = getClientOrThrow();
    const { data, error } = await client.auth.getUser();

    if (error) {
      throw error;
    }

    return {
      user: data?.user || null,
      error: null
    };
  } catch (error) {
    return {
      user: null,
      error: buildErrorMessage("Fetch current user", error)
    };
  }
}

export async function isAuthenticated() {
  try {
    const sessionResult = await getSession();

    if (sessionResult.error) {
      throw new Error(sessionResult.error);
    }

    return {
      isAuthenticated: Boolean(sessionResult.session),
      error: null
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      error: buildErrorMessage("Authentication check", error)
    };
  }
}

export async function getSession() {
  try {
    const client = getClientOrThrow();
    const { data, error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    return {
      session: data?.session || null,
      error: null
    };
  } catch (error) {
    return {
      session: null,
      error: buildErrorMessage("Fetch session", error)
    };
  }
}
