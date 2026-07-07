/**
 * Google Play Developer API Service
 * Handles authentication and API calls for managing app listings and localizations
 */

// Use proxy to avoid CORS - similar to App Store Connect
const BASE_URL = import.meta.env.VITE_GP_PROXY_URL
  ? `${import.meta.env.VITE_GP_PROXY_URL}/androidpublisher/v3`
  : '/api/googleplay/androidpublisher/v3'

// Google Play supported locales with display info
export const GP_LOCALES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'en-AU', name: 'English (AU)', flag: '🇦🇺' },
  { code: 'en-CA', name: 'English (CA)', flag: '🇨🇦' },
  { code: 'en-IN', name: 'English (IN)', flag: '🇮🇳' },
  { code: 'fr-FR', name: 'French (FR)', flag: '🇫🇷' },
  { code: 'fr-CA', name: 'French (CA)', flag: '🇨🇦' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪' },
  { code: 'es-ES', name: 'Spanish (Spain)', flag: '🇪🇸' },
  { code: 'es-419', name: 'Spanish (LATAM)', flag: '🌎' },
  { code: 'es-MX', name: 'Spanish (Mexico)', flag: '🇲🇽' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Portuguese (BR)', flag: '🇧🇷' },
  { code: 'pt-PT', name: 'Portuguese (PT)', flag: '🇵🇹' },
  { code: 'nl-NL', name: 'Dutch', flag: '🇳🇱' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'tr-TR', name: 'Turkish', flag: '🇹🇷' },
  { code: 'ru-RU', name: 'Russian', flag: '🇷🇺' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'pl-PL', name: 'Polish', flag: '🇵🇱' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'cs-CZ', name: 'Czech', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'da-DK', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi-FI', name: 'Finnish', flag: '🇫🇮' },
  { code: 'sv-SE', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no-NO', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'el-GR', name: 'Greek', flag: '🇬🇷' },
  { code: 'iw-IL', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { code: 'hu-HU', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
]

// Token cache for OAuth access tokens
const TOKEN_CACHE_KEY = 'gp-token-cache'

function getTokenCache() {
  try {
    const cached = sessionStorage.getItem(TOKEN_CACHE_KEY)
    if (cached) return JSON.parse(cached)
  } catch { /* ignore */ }
  return null
}

function setTokenCache(token, expiry) {
  try {
    sessionStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify({ token, expiry }))
  } catch { /* ignore */ }
}

// Check if we have a valid cached token
export function hasValidToken() {
  const cache = getTokenCache()
  const now = Date.now()
  return cache && (cache.expiry - now) > 60000
}

// Get remaining time in seconds for the cached token
export function getTokenTimeLeft() {
  const cache = getTokenCache()
  if (!cache) return 0
  const timeLeft = Math.max(0, Math.floor((cache.expiry - Date.now()) / 1000))
  return timeLeft > 60 ? timeLeft : 0
}

// Get cached token
export function getCachedToken() {
  const cache = getTokenCache()
  const now = Date.now()
  if (cache && (cache.expiry - now) > 60000) {
    return cache.token
  }
  return null
}


/**
 * Generate OAuth2 access token from service account JSON key
 * Uses JWT Bearer flow for service accounts
 */
export async function generateAccessToken(serviceAccountJson) {
  const cache = getTokenCache()
  const now = Date.now()
  
  // Check cached token first
  if (cache && (cache.expiry - now) > 60000) {
    return cache.token
  }
  
  if (!serviceAccountJson) {
    throw new Error('Service account JSON required')
  }

  let serviceAccount
  try {
    serviceAccount = typeof serviceAccountJson === 'string' 
      ? JSON.parse(serviceAccountJson) 
      : serviceAccountJson
  } catch {
    throw new Error('Invalid service account JSON format')
  }

  const { client_email, private_key } = serviceAccount
  if (!client_email || !private_key) {
    throw new Error('Service account must contain client_email and private_key')
  }

  // Create JWT for Google OAuth2
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600 // 1 hour

  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp
  }

  // Sign JWT with private key
  const { SignJWT, importPKCS8 } = await import('jose')
  
  const privateKey = await importPKCS8(private_key, 'RS256')
  
  const jwt = await new SignJWT(payload)
    .setProtectedHeader(header)
    .sign(privateKey)

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })

  const tokenData = await tokenResponse.json()
  
  if (tokenData.error) {
    throw new Error(tokenData.error_description || tokenData.error)
  }

  const accessToken = tokenData.access_token
  const expiresIn = tokenData.expires_in || 3600
  
  // Cache the token
  setTokenCache(accessToken, now + (expiresIn * 1000) - 60000)
  
  return accessToken
}

// Make authenticated API request
async function apiRequest(endpoint, token, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`

  const response = await fetch(url, {
    // Store data must always be fresh — bypass the browser HTTP cache
    cache: 'no-store',
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 204) {
    return null
  }

  let data = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      // Not JSON
    }
  }

  if (!response.ok) {
    const errorMessage = data?.error?.message || `API request failed: ${response.status}`
    throw new Error(errorMessage)
  }

  return data
}

/**
 * Test connection to Google Play API
 * 
 * IMPORTANT: Unlike App Store Connect, Google Play API has NO endpoint to list all apps.
 * Every endpoint requires a packageName. To properly test:
 * 1. First we validate the service account JSON and generate a token
 * 2. Then with a package name, we test actual API access by creating/deleting an edit
 * 
 * Common errors:
 * - "The caller does not have permission" = Service account not linked in Play Console
 *   or doesn't have permissions for this specific app
 */
export async function testConnection(credentials, packageName) {
  try {
    // Step 1: Validate service account and generate token
    const token = await generateAccessToken(credentials.serviceAccountJson)
    
    if (!packageName) {
      // Token generated successfully - that's all we can verify without a package name
      return { 
        success: true, 
        tokenOnly: true,
        message: 'Service account valid! Enter a package name to verify API permissions.' 
      }
    }
    
    // Step 2: Test actual API access with the package name
    // We create an edit and immediately delete it to verify permissions
    const data = await apiRequest(`/applications/${packageName}/edits`, token, {
      method: 'POST',
      body: JSON.stringify({})
    })
    
    // If we got here, we have permission - clean up the test edit
    if (data?.id) {
      try {
        await apiRequest(`/applications/${packageName}/edits/${data.id}`, token, {
          method: 'DELETE'
        })
      } catch {
        // Ignore delete errors - the edit will expire anyway
      }
    }
    
    return { success: true, message: 'Connected! Full API access verified.' }
  } catch (error) {
    // Provide helpful error messages
    let message = error.message
    
    if (message.includes('does not have permission') || message.includes('403')) {
      message = `Permission denied. Make sure:\n` +
        `1. Service account is linked in Play Console → Settings → API access\n` +
        `2. Service account has "Admin" or "Release manager" permission for this app\n` +
        `3. Package name "${packageName}" is correct`
    } else if (message.includes('404') || message.includes('not found')) {
      message = `App not found. Check that "${packageName}" exists in your Play Console.`
    }
    
    return { success: false, message }
  }
}

/**
 * Create a new edit for an app
 * All changes must be made within an edit, then committed
 */
export async function createEdit(credentials, packageName) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  const data = await apiRequest(`/applications/${packageName}/edits`, token, {
    method: 'POST',
    body: JSON.stringify({})
  })
  return data.id
}

/**
 * Get an existing edit
 */
export async function getEdit(credentials, packageName, editId) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  return await apiRequest(`/applications/${packageName}/edits/${editId}`, token)
}

/**
 * Commit an edit (publish changes)
 */
export async function commitEdit(credentials, packageName, editId) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  return await apiRequest(`/applications/${packageName}/edits/${editId}:commit`, token, {
    method: 'POST'
  })
}

/**
 * Delete an edit (discard changes)
 */
export async function deleteEdit(credentials, packageName, editId) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  await apiRequest(`/applications/${packageName}/edits/${editId}`, token, {
    method: 'DELETE'
  })
}

/**
 * List all store listings for an app
 */
export async function listListings(credentials, packageName, editId) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  const data = await apiRequest(
    `/applications/${packageName}/edits/${editId}/listings`,
    token
  )
  return data.listings || []
}

/**
 * Get a specific store listing
 */
export async function getListing(credentials, packageName, editId, language) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  return await apiRequest(
    `/applications/${packageName}/edits/${editId}/listings/${language}`,
    token
  )
}

/**
 * Update or create a store listing
 */
export async function updateListing(credentials, packageName, editId, language, listing) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  return await apiRequest(
    `/applications/${packageName}/edits/${editId}/listings/${language}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify(listing)
    }
  )
}

/**
 * Delete a store listing
 */
export async function deleteListing(credentials, packageName, editId, language) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  await apiRequest(
    `/applications/${packageName}/edits/${editId}/listings/${language}`,
    token,
    { method: 'DELETE' }
  )
}


/**
 * Get app details (basic info)
 */
export async function getAppDetails(credentials, packageName, editId) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  return await apiRequest(
    `/applications/${packageName}/edits/${editId}/details`,
    token
  )
}

/**
 * Update app details
 */
export async function updateAppDetails(credentials, packageName, editId, details) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  return await apiRequest(
    `/applications/${packageName}/edits/${editId}/details`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify(details)
    }
  )
}

/**
 * List images for a listing
 */
export async function listImages(credentials, packageName, editId, language, imageType) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  const data = await apiRequest(
    `/applications/${packageName}/edits/${editId}/listings/${language}/${imageType}`,
    token
  )
  return data.images || []
}

/**
 * Upload an image
 */
export async function uploadImage(credentials, packageName, editId, language, imageType, imageData) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  
  const url = `${BASE_URL}/applications/${packageName}/edits/${editId}/listings/${language}/${imageType}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'image/png'
    },
    body: imageData
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Upload failed: ${response.status}`)
  }

  return await response.json()
}

/**
 * Delete an image
 */
export async function deleteImage(credentials, packageName, editId, language, imageType, imageId) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  await apiRequest(
    `/applications/${packageName}/edits/${editId}/listings/${language}/${imageType}/${imageId}`,
    token,
    { method: 'DELETE' }
  )
}

/**
 * Delete all images for a language and image type
 */
export async function deleteAllImages(credentials, packageName, editId, language, imageType) {
  const token = await generateAccessToken(credentials.serviceAccountJson)
  await apiRequest(
    `/applications/${packageName}/edits/${editId}/listings/${language}/${imageType}`,
    token,
    { method: 'DELETE' }
  )
}

// Image types supported by Google Play
export const GP_IMAGE_TYPES = {
  'phoneScreenshots': { name: 'Phone Screenshots', max: 8 },
  'sevenInchScreenshots': { name: '7" Tablet Screenshots', max: 8 },
  'tenInchScreenshots': { name: '10" Tablet Screenshots', max: 8 },
  'tvScreenshots': { name: 'TV Screenshots', max: 8 },
  'wearScreenshots': { name: 'Wear OS Screenshots', max: 8 },
  'icon': { name: 'App Icon', max: 1 },
  'featureGraphic': { name: 'Feature Graphic', max: 1 },
  'tvBanner': { name: 'TV Banner', max: 1 },
}

/**
 * Translate Google Play content using AI
 */
export async function translateGooglePlayContent(text, targetLocale, aiConfig, fieldType = 'fullDescription') {
  const { provider, apiKey, model, region, endpoint } = aiConfig

  // Character limits per field type
  const charLimits = {
    title: 30,
    shortDescription: 80,
    fullDescription: 4000,
    video: 500,
  }

  const limit = charLimits[fieldType] || 4000
  const localeInfo = GP_LOCALES.find(l => l.code === targetLocale)
  const localeName = localeInfo?.name || targetLocale

  const userMessage = `Translate to ${localeName} (max ${limit} chars):\n\n${text}`

  try {
    let content
    const { translateText } = await import('@/services/translationService')
    
    content = await translateText(
      userMessage,
      'en-US',
      targetLocale,
      { provider, apiKey, model, region, endpoint }
    )

    // Enforce character limit
    if (content && content.length > limit) {
      content = content.substring(0, limit - 3) + '...'
    }

    return { translation: content, error: null }
  } catch (error) {
    return { translation: null, error: error.message }
  }
}

/**
 * Translate all fields for a listing
 */
export async function translateAllFields(sourceListing, targetLocale, aiConfig, fieldsToTranslate, onProgress) {
  const results = {}
  const errors = []
  const skipped = []
  const total = fieldsToTranslate.length
  let current = 0

  for (const field of fieldsToTranslate) {
    current++
    const sourceText = sourceListing[field]

    if (!sourceText || sourceText.trim() === '') {
      // Omit empty source fields instead of returning '' — writing '' back
      // would silently clear the target locale while reporting success.
      skipped.push(field)
      onProgress?.({ field, current, total, status: 'skipped' })
      continue
    }

    onProgress?.({ field, current, total })

    const { translation, error } = await translateGooglePlayContent(
      sourceText,
      targetLocale,
      aiConfig,
      field
    )

    if (error) {
      errors.push({ field, error })
      results[field] = sourceText // Keep original on error
      onProgress?.({ field, current, total, error })
    } else {
      results[field] = translation
    }

    // Small delay between translations
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return { results, errors, skipped }
}

// Normalize locale code to Google Play format
export function normalizeLocaleCode(code) {
  const lower = code.toLowerCase()
  
  const mapping = {
    'en': 'en-US',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'es': 'es-ES',
    'it': 'it-IT',
    'pt': 'pt-BR',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'zh': 'zh-CN',
    'zh-hans': 'zh-CN',
    'zh-hant': 'zh-TW',
    'ru': 'ru-RU',
    'pl': 'pl-PL',
    'tr': 'tr-TR',
    'nl': 'nl-NL',
    'sv': 'sv-SE',
    'da': 'da-DK',
    'fi': 'fi-FI',
    'no': 'no-NO',
    'cs': 'cs-CZ',
    'hu': 'hu-HU',
    'el': 'el-GR',
    'he': 'iw-IL',
  }

  return mapping[lower] || code
}

/**
 * Fetch apps from a developer's public Google Play profile
 * @param {string} developerUrl - Full URL or just the developer ID
 * @returns {Promise<{apps: Array<{packageName: string, name: string}>, developerId: string}>}
 */
export async function fetchDeveloperApps(developerUrl) {
  // Extract developer ID from URL or use directly if it's just the ID
  let developerId = developerUrl
  
  // Handle full URLs like https://play.google.com/store/apps/dev?id=1234567890
  const urlMatch = developerUrl.match(/[?&]id=(\d+)/)
  if (urlMatch) {
    developerId = urlMatch[1]
  } else if (!/^\d+$/.test(developerUrl)) {
    throw new Error('Invalid developer URL or ID. Expected a URL like "https://play.google.com/store/apps/dev?id=123456" or just the numeric ID.')
  }

  // Use proxy to fetch the developer page
  const proxyBase = import.meta.env.VITE_GP_PROXY_URL || '/api/googleplay'
  const response = await fetch(`${proxyBase}/playstore/dev/${developerId}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch developer apps: ${response.status}`)
  }

  const data = await response.json()
  
  if (!data.apps || data.apps.length === 0) {
    throw new Error('No apps found for this developer. Make sure the developer ID is correct and the profile is public.')
  }

  return {
    developerId: data.developerId,
    apps: data.apps
  }
}
