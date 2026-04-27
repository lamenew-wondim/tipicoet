import { Cache } from './cache';

/**
 * Enhanced fetcher with server-side caching and SWR logic.
 * @param {string} endpoint - The API-Football endpoint
 * @param {number} ttl - Time to live in seconds
 */
export async function fetchFootball(endpoint, ttl = 60) {
  const host = process.env.API_FOOTBALL_HOST || "v3.football.api-sports.io";
  const apiKey = process.env.API_FOOTBALL_KEY;
  
  if (!apiKey) {
    console.error("Missing API_FOOTBALL_KEY");
    return { error: true, message: "API key is missing" };
  }

  // 1. Check Cache
  const cached = Cache.get(endpoint);
  
  if (cached) {
    if (cached.isStale) {
      console.log(`[Cache] SWR TRIGGERED: ${endpoint}`);
      // Return stale data immediately, but refresh in background
      // Note: We don't await this
      fetchFromApi(endpoint, host, apiKey, ttl).catch(err => {
        console.error(`[Cache] Background refresh failed for ${endpoint}:`, err);
      });
    } else {
      console.log(`[Cache] HIT: ${endpoint}`);
    }
    return cached.data;
  }

  // 2. Cache MISS: Fetch fresh data
  console.log(`[Cache] MISS: ${endpoint}. Fetching...`);
  return await fetchFromApi(endpoint, host, apiKey, ttl);
}

/**
 * Internal helper to perform the actual network request.
 */
async function fetchFromApi(endpoint, host, apiKey, ttl, retries = 2) {
  try {
    const res = await fetch(`https://${host}${endpoint}`, {
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch API-Football: ${res.statusText}`);
    }

    const data = await res.json();

    // Check for API-Sports internal errors (like limit reached)
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.warn("[API-Football] Provider returned errors:", data.errors);
      
      // If rate limited, wait and retry
      if ((data.errors.requests || data.errors.rateLimit) && retries > 0) {
        const delay = 1000 + Math.random() * 2000; // 1s to 3s delay
        console.log(`[API-Football] Rate limited. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        return fetchFromApi(endpoint, host, apiKey, ttl, retries - 1);
      }

      // If we have "requests" limit error, we might want to return what we have or a specific error
      return { ...data, error: true, message: "API Provider reported errors" };
    }

    // Success: Update cache
    Cache.set(endpoint, data, ttl);
    return data;
  } catch (error) {
    console.error("[API-Football] Fetch Error:", error);
    return { error: true, message: error.message };
  }
}
