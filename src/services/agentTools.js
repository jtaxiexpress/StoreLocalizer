// Tool registry for the Agent page. Each tool wraps an existing service
// function and exposes it to the LLM as an OpenAI-style function definition
// ({ name, description, parameters } JSON Schema) plus an async executor.
//
// Tools flagged `write: true` mutate live store data (App Store Connect /
// Google Play) — the agent UI asks the user for approval before running them
// unless auto-approve is enabled.

import {
  listApps as ascListApps,
  listVersions as ascListVersions,
  getVersionLocalizations as ascGetVersionLocalizations,
  updateVersionLocalization as ascUpdateVersionLocalization,
  createVersionLocalization as ascCreateVersionLocalization,
  getAppInfoLocalizations as ascGetAppInfoLocalizations,
  updateAppInfoLocalization as ascUpdateAppInfoLocalization,
  createAppInfoLocalization as ascCreateAppInfoLocalization,
  createVersion as ascCreateVersion,
  generateToken as ascGenerateToken,
  apiRequest as ascApiRequest,
  getScreenshotSets as ascGetScreenshotSets,
  ASC_LOCALES,
} from './appStoreConnectService'
import {
  createEdit as gpCreateEdit,
  commitEdit as gpCommitEdit,
  deleteEdit as gpDeleteEdit,
  listListings as gpListListings,
  getListing as gpGetListing,
  updateListing as gpUpdateListing,
  getAppDetails as gpGetAppDetails,
  updateAppDetails as gpUpdateAppDetails,
} from './googlePlayService'
import { callChatCompletion } from './translationService'
import {
  listApps as acListApps,
  getKeywordSuggestions as acGetKeywordSuggestions,
  getAppKeywords as acGetAppKeywords,
  extractCompetitorKeywords as acExtractCompetitorKeywords,
  addKeywords as acAddKeywords,
} from './appCompeteService'
import { getTranslationStats } from '../utils/xcstringsParser'

// Keep tool results small enough for the model context
const MAX_RESULT_CHARS = 20000
const PREVIEW_CHARS = 300

export function truncateToolResult(text) {
  if (typeof text !== 'string') text = JSON.stringify(text)
  if (text.length <= MAX_RESULT_CHARS) return text
  return `${text.slice(0, MAX_RESULT_CHARS)}… [truncated, ${text.length} chars total]`
}

function clip(value, max = PREVIEW_CHARS) {
  if (typeof value !== 'string' || value.length <= max) return value
  return `${value.slice(0, max)}… [truncated, ${value.length} chars total — fetch the full record for the complete text]`
}

// Thrown when a tool needs a service that isn't configured yet — the agent UI
// detects it via `service` and shows a dismissible "configure" card in the chat.
export class NotConfiguredError extends Error {
  constructor(service, message) {
    super(message)
    this.name = 'NotConfiguredError'
    this.service = service // 'asc' | 'gp' | 'appcompete'
  }
}

function requireAsc(ctx) {
  const creds = ctx.ascCredentials
  if (!creds?.keyId || !creds?.issuerId) {
    throw new NotConfiguredError('asc', 'App Store Connect is not configured. Ask the user to enter their ASC credentials (Key ID, Issuer ID and .p8 private key) in the sidebar first.')
  }
  return creds
}

function requireGp(ctx) {
  const creds = ctx.gpCredentials
  if (!creds?.serviceAccountJson) {
    throw new NotConfiguredError('gp', 'Google Play is not configured. Ask the user to load their service account JSON in the sidebar first.')
  }
  return creds
}

function requireAppCompete(ctx) {
  const apiKey = ctx.appCompeteConfig?.apiKey
  if (!apiKey) {
    throw new NotConfiguredError('appcompete', 'AppCompete is not configured. Ask the user to enter their AppCompete API key in the sidebar (AppCompete section) first.')
  }
  return apiKey
}

const str = (description) => ({ type: 'string', description })

// Max screenshots attached to a single tool result (vision context budget)
const MAX_SCREENSHOT_IMAGES = 10

function screenshotImageUrl(imageAsset, width = 512, height = 1024) {
  if (!imageAsset?.templateUrl) return null
  return imageAsset.templateUrl
    .replace('{w}', String(width))
    .replace('{h}', String(height))
    .replace('{f}', 'png')
}

/**
 * Fetch the screenshots of one localization of a version, resolved by locale.
 * Shared by the asc_list_screenshots tool and the agent UI's locale switcher.
 * @returns {Promise<{ data: object, images: Array<{ url, name }> }>}
 */
export async function fetchScreenshotsForLocale(credentials, versionId, locale) {
  const locs = await ascGetVersionLocalizations(credentials, versionId)
  const loc = locs.find((l) => l.locale.toLowerCase() === String(locale).toLowerCase())
  if (!loc) {
    throw new Error(`Locale "${locale}" not found on this version. Available locales: ${locs.map((l) => l.locale).join(', ')}`)
  }

  const sets = await ascGetScreenshotSets(credentials, loc.id)
  const images = []
  let totalScreenshots = 0
  const dataSets = sets.map((set) => {
    totalScreenshots += set.screenshots.length
    for (let i = 0; i < set.screenshots.length; i++) {
      const shot = set.screenshots[i]
      if (images.length >= MAX_SCREENSHOT_IMAGES) break
      const url = screenshotImageUrl(shot.imageAsset)
      if (url) {
        images.push({
          url,
          fullUrl: screenshotImageUrl(shot.imageAsset, 1200, 2400) || url,
          name: `${set.displayInfo.name} #${i + 1} — ${shot.fileName}`,
        })
      }
    }
    return {
      displayType: set.displayType,
      name: set.displayInfo.name,
      device: set.displayInfo.device,
      count: set.screenshots.length,
      screenshots: set.screenshots.map((s) => ({
        fileName: s.fileName,
        width: s.imageAsset?.width,
        height: s.imageAsset?.height,
        state: s.assetDeliveryState?.state,
      })),
    }
  })

  const data = {
    versionId,
    locale: loc.locale,
    localizationId: loc.id,
    totalScreenshots,
    sets: dataSets,
  }
  if (totalScreenshots > images.length) {
    data.note = `Only the first ${images.length} screenshots are attached as images (across all display types).`
  }
  return { data, images }
}

/**
 * Build the tool list for one agent run.
 * @param {object} ctx - { ascCredentials, gpCredentials, aiConfig, xcstringsData, fileName }
 */
export function buildAgentTools(ctx) {
  return [
    // ----------------------------------------------------------- App Store Connect
    {
      name: 'asc_list_apps',
      description: 'List all apps in the App Store Connect account (id, name, bundleId).',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => {
        const apps = await ascListApps(requireAsc(ctx))
        return apps.map(({ id, name, bundleId }) => ({ id, name, bundleId }))
      },
    },
    {
      name: 'asc_list_versions',
      description: 'List the App Store versions of an app (id, versionString, state, platform), newest first.',
      parameters: {
        type: 'object',
        properties: { appId: str('The App Store Connect app id (from asc_list_apps)') },
        required: ['appId'],
      },
      execute: async ({ appId }) => ascListVersions(requireAsc(ctx), appId),
    },
    {
      name: 'asc_get_version_localizations',
      description: 'List the localizations of an App Store version. Long text fields are truncated to 300 chars — use asc_get_version_localization for the full text of one locale.',
      parameters: {
        type: 'object',
        properties: { versionId: str('The version id (from asc_list_versions)') },
        required: ['versionId'],
      },
      execute: async ({ versionId }) => {
        const locs = await ascGetVersionLocalizations(requireAsc(ctx), versionId)
        return locs.map((loc) => ({
          ...loc,
          description: clip(loc.description),
          whatsNew: clip(loc.whatsNew),
          promotionalText: clip(loc.promotionalText),
        }))
      },
    },
    {
      name: 'asc_get_version_localization',
      description: 'Get one App Store version localization with full, untruncated text fields.',
      parameters: {
        type: 'object',
        properties: { localizationId: str('The localization id (from asc_get_version_localizations)') },
        required: ['localizationId'],
      },
      execute: async ({ localizationId }) => {
        const creds = requireAsc(ctx)
        const token = await ascGenerateToken(creds.keyId, creds.issuerId, creds.privateKey)
        const data = await ascApiRequest(`/appStoreVersionLocalizations/${encodeURIComponent(localizationId)}`, token)
        return { id: data.data.id, ...data.data.attributes }
      },
    },
    {
      name: 'asc_update_version_localization',
      description: 'Update fields of an App Store version localization. Only provided fields are changed. Limits: description/whatsNew 4000 chars, keywords 100 chars (comma-separated), promotionalText 170 chars.',
      write: true,
      parameters: {
        type: 'object',
        properties: {
          localizationId: str('The localization id to update'),
          description: str('App description (max 4000 chars)'),
          keywords: str('Comma-separated keywords (max 100 chars total)'),
          whatsNew: str('Release notes (max 4000 chars)'),
          promotionalText: str('Promotional text (max 170 chars)'),
          marketingUrl: str('Marketing URL'),
          supportUrl: str('Support URL'),
        },
        required: ['localizationId'],
      },
      execute: async ({ localizationId, ...updates }) => {
        const fields = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null))
        if (!Object.keys(fields).length) throw new Error('No fields to update were provided')
        await ascUpdateVersionLocalization(requireAsc(ctx), localizationId, fields)
        return { success: true, localizationId, updatedFields: Object.keys(fields) }
      },
    },
    {
      name: 'asc_create_version_localization',
      description: 'Add a new locale to an App Store version, optionally with initial content.',
      write: true,
      parameters: {
        type: 'object',
        properties: {
          versionId: str('The version id'),
          locale: str('ASC locale code, e.g. fr-FR, de-DE, ja (see asc_list_locales)'),
          description: str('App description (max 4000 chars)'),
          keywords: str('Comma-separated keywords (max 100 chars total)'),
          whatsNew: str('Release notes (max 4000 chars)'),
          promotionalText: str('Promotional text (max 170 chars)'),
        },
        required: ['versionId', 'locale'],
      },
      execute: async ({ versionId, locale, ...content }) => {
        const fields = Object.fromEntries(Object.entries(content).filter(([, v]) => v !== undefined && v !== null))
        const id = await ascCreateVersionLocalization(requireAsc(ctx), versionId, locale, fields)
        return { success: true, localizationId: id, locale }
      },
    },
    {
      name: 'asc_get_app_info_localizations',
      description: 'Get the app-level localizations (app name, subtitle, privacy policy) for an app. Returns appInfoId + localizations.',
      parameters: {
        type: 'object',
        properties: { appId: str('The App Store Connect app id') },
        required: ['appId'],
      },
      execute: async ({ appId }) => ascGetAppInfoLocalizations(requireAsc(ctx), appId),
    },
    {
      name: 'asc_update_app_info_localization',
      description: 'Update the app name, subtitle or privacy policy URL of an app-info localization. Limits: name 30 chars, subtitle 30 chars.',
      write: true,
      parameters: {
        type: 'object',
        properties: {
          localizationId: str('The app-info localization id (from asc_get_app_info_localizations)'),
          name: str('App name (max 30 chars)'),
          subtitle: str('App subtitle (max 30 chars)'),
          privacyPolicyUrl: str('Privacy policy URL'),
        },
        required: ['localizationId'],
      },
      execute: async ({ localizationId, ...updates }) => {
        const fields = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null))
        if (!Object.keys(fields).length) throw new Error('No fields to update were provided')
        await ascUpdateAppInfoLocalization(requireAsc(ctx), localizationId, fields)
        return { success: true, localizationId, updatedFields: Object.keys(fields) }
      },
    },
    {
      name: 'asc_create_app_info_localization',
      description: 'Add a new app-info localization (app name/subtitle) for a locale.',
      write: true,
      parameters: {
        type: 'object',
        properties: {
          appInfoId: str('The appInfoId (from asc_get_app_info_localizations)'),
          locale: str('ASC locale code, e.g. fr-FR'),
          name: str('App name (max 30 chars)'),
          subtitle: str('App subtitle (max 30 chars)'),
        },
        required: ['appInfoId', 'locale'],
      },
      execute: async ({ appInfoId, locale, ...content }) => {
        const fields = Object.fromEntries(Object.entries(content).filter(([, v]) => v !== undefined && v !== null))
        const id = await ascCreateAppInfoLocalization(requireAsc(ctx), appInfoId, locale, fields)
        return { success: true, localizationId: id, locale }
      },
    },
    {
      name: 'asc_create_version',
      description: 'Create a new App Store version for an app (e.g. "2.1.0").',
      write: true,
      parameters: {
        type: 'object',
        properties: {
          appId: str('The App Store Connect app id'),
          versionString: str('The version string, e.g. 2.1.0'),
          platform: { type: 'string', enum: ['IOS', 'MAC_OS', 'TV_OS', 'VISION_OS'], description: 'Platform (default IOS)' },
        },
        required: ['appId', 'versionString'],
      },
      execute: async ({ appId, versionString, platform }) =>
        ascCreateVersion(requireAsc(ctx), appId, versionString, platform || 'IOS'),
    },
    {
      name: 'asc_list_locales',
      description: 'List all locale codes supported by App Store Connect (code + display name). Local lookup, no API call.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ASC_LOCALES.map(({ code, name }) => ({ code, name })),
    },
    {
      name: 'asc_list_screenshots',
      description: 'List the App Store screenshots of one locale of a version, grouped by device/display type. The screenshots are also attached as images so you can SEE them — use this when the user asks for feedback or advice on their screenshots. The UI displays them in a gallery where the user can switch locale.',
      parameters: {
        type: 'object',
        properties: {
          versionId: str('The version id (from asc_list_versions)'),
          locale: str('ASC locale code, e.g. en-US, fr-FR (see asc_get_version_localizations for the available ones)'),
        },
        required: ['versionId', 'locale'],
      },
      execute: async ({ versionId, locale }) => {
        const { data, images } = await fetchScreenshotsForLocale(requireAsc(ctx), versionId, locale)
        return { ...data, images }
      },
    },

    // ----------------------------------------------------------------- Google Play
    {
      name: 'gp_list_listings',
      description: 'List the Google Play store listings of an app (all languages, summarized). Use gp_get_listing for the full text of one language.',
      parameters: {
        type: 'object',
        properties: { packageName: str('The Android package name, e.g. com.example.app') },
        required: ['packageName'],
      },
      execute: async ({ packageName }) => {
        const creds = requireGp(ctx)
        const editId = await gpCreateEdit(creds, packageName)
        try {
          const listings = await gpListListings(creds, packageName, editId)
          return listings.map((l) => ({
            language: l.language,
            title: l.title,
            shortDescription: clip(l.shortDescription, 120),
            fullDescriptionLength: l.fullDescription?.length || 0,
            video: l.video || null,
          }))
        } finally {
          try { await gpDeleteEdit(creds, packageName, editId) } catch { /* edit expires on its own */ }
        }
      },
    },
    {
      name: 'gp_get_listing',
      description: 'Get one Google Play store listing (title, shortDescription, fullDescription, video) with full text.',
      parameters: {
        type: 'object',
        properties: {
          packageName: str('The Android package name'),
          language: str('BCP-47 language code as used in Play Console, e.g. fr-FR, de-DE, en-US'),
        },
        required: ['packageName', 'language'],
      },
      execute: async ({ packageName, language }) => {
        const creds = requireGp(ctx)
        const editId = await gpCreateEdit(creds, packageName)
        try {
          return await gpGetListing(creds, packageName, editId, language)
        } finally {
          try { await gpDeleteEdit(creds, packageName, editId) } catch { /* edit expires on its own */ }
        }
      },
    },
    {
      name: 'gp_update_listing',
      description: 'Update (or create) a Google Play store listing for one language and PUBLISH the change (creates an edit, merges with the existing listing, commits). Limits: title 30 chars, shortDescription 80 chars, fullDescription 4000 chars.',
      write: true,
      parameters: {
        type: 'object',
        properties: {
          packageName: str('The Android package name'),
          language: str('BCP-47 language code, e.g. fr-FR'),
          title: str('App title (max 30 chars)'),
          shortDescription: str('Short description (max 80 chars)'),
          fullDescription: str('Full description (max 4000 chars)'),
          video: str('YouTube video URL'),
        },
        required: ['packageName', 'language'],
      },
      execute: async ({ packageName, language, ...updates }) => {
        const creds = requireGp(ctx)
        const provided = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null))
        if (!Object.keys(provided).length) throw new Error('No fields to update were provided')
        const editId = await gpCreateEdit(creds, packageName)
        try {
          let existing = {}
          try {
            existing = (await gpGetListing(creds, packageName, editId, language)) || {}
          } catch {
            existing = {} // listing doesn't exist yet for this language
          }
          const listing = { language }
          for (const field of ['title', 'shortDescription', 'fullDescription', 'video']) {
            const value = provided[field] ?? existing[field]
            if (value !== undefined && value !== null && value !== '') listing[field] = value
          }
          await gpUpdateListing(creds, packageName, editId, language, listing)
          await gpCommitEdit(creds, packageName, editId)
          return { success: true, committed: true, language, updatedFields: Object.keys(provided) }
        } catch (error) {
          try { await gpDeleteEdit(creds, packageName, editId) } catch { /* edit expires on its own */ }
          throw error
        }
      },
    },
    {
      name: 'gp_get_app_details',
      description: 'Get the Google Play app details (default language, contact email/phone/website).',
      parameters: {
        type: 'object',
        properties: { packageName: str('The Android package name') },
        required: ['packageName'],
      },
      execute: async ({ packageName }) => {
        const creds = requireGp(ctx)
        const editId = await gpCreateEdit(creds, packageName)
        try {
          return await gpGetAppDetails(creds, packageName, editId)
        } finally {
          try { await gpDeleteEdit(creds, packageName, editId) } catch { /* edit expires on its own */ }
        }
      },
    },
    {
      name: 'gp_update_app_details',
      description: 'Update the Google Play app details (contact info, default language) and PUBLISH the change.',
      write: true,
      parameters: {
        type: 'object',
        properties: {
          packageName: str('The Android package name'),
          contactEmail: str('Contact email'),
          contactPhone: str('Contact phone'),
          contactWebsite: str('Contact website URL'),
          defaultLanguage: str('Default language code, e.g. en-US'),
        },
        required: ['packageName'],
      },
      execute: async ({ packageName, ...updates }) => {
        const creds = requireGp(ctx)
        const provided = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null))
        if (!Object.keys(provided).length) throw new Error('No fields to update were provided')
        const editId = await gpCreateEdit(creds, packageName)
        try {
          const existing = (await gpGetAppDetails(creds, packageName, editId)) || {}
          await gpUpdateAppDetails(creds, packageName, editId, { ...existing, ...provided })
          await gpCommitEdit(creds, packageName, editId)
          return { success: true, committed: true, updatedFields: Object.keys(provided) }
        } catch (error) {
          try { await gpDeleteEdit(creds, packageName, editId) } catch { /* edit expires on its own */ }
          throw error
        }
      },
    },

    // ---------------------------------------------------------------------- ASO
    // AppCompete (keyword tracking / ASO). The appleId is the numeric App Store
    // id — the same id returned by asc_list_apps.
    {
      name: 'aso_list_apps',
      description: 'List the apps tracked on AppCompete (ASO keyword tracker): appleId, name, number of tracked keywords.',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => acListApps(requireAppCompete(ctx)),
    },
    {
      name: 'aso_get_keyword_suggestions',
      description: 'Get ASO keyword suggestions for an app (popularity, difficulty, opportunity) from AppCompete.',
      parameters: {
        type: 'object',
        properties: {
          appleId: str('The numeric App Store app id (from asc_list_apps or aso_list_apps)'),
          country: str('Two-letter App Store country code, e.g. us, fr, de (default us)'),
        },
        required: ['appleId'],
      },
      execute: async ({ appleId, country }) => acGetKeywordSuggestions(requireAppCompete(ctx), appleId, country || 'us'),
    },
    {
      name: 'aso_get_app_keywords',
      description: 'Get the keywords an app ranks for / tracks on AppCompete, with position, popularity and difficulty. Use this to audit current App Store keywords.',
      parameters: {
        type: 'object',
        properties: {
          appleId: str('The numeric App Store app id'),
          country: str('Two-letter App Store country code, e.g. us, fr (default us)'),
        },
        required: ['appleId'],
      },
      execute: async ({ appleId, country }) => acGetAppKeywords(requireAppCompete(ctx), appleId, country || 'us'),
    },
    {
      name: 'aso_extract_competitor_keywords',
      description: 'Extract the keywords of a competitor app (its App Store keyword field, as seen by AppCompete). Useful to find keyword ideas from competitors.',
      parameters: {
        type: 'object',
        properties: {
          appleId: str('The numeric App Store id of the competitor app'),
          country: str('Two-letter App Store country code, e.g. us, fr (default us)'),
        },
        required: ['appleId'],
      },
      execute: async ({ appleId, country }) => acExtractCompetitorKeywords(requireAppCompete(ctx), appleId, country || 'us'),
    },
    {
      name: 'aso_add_keywords',
      description: 'Add keywords to track for an app on AppCompete (max 20 per call).',
      write: true,
      parameters: {
        type: 'object',
        properties: {
          appleId: str('The numeric App Store app id'),
          keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to track (max 20)' },
          country: str('Two-letter App Store country code, e.g. us, fr (default us)'),
        },
        required: ['appleId', 'keywords'],
      },
      execute: async ({ appleId, keywords, country }) => {
        if (!Array.isArray(keywords) || !keywords.length) throw new Error('No keywords provided')
        return acAddKeywords(requireAppCompete(ctx), appleId, keywords, country || 'us')
      },
    },

    // ------------------------------------------------------------------- Utilities
    {
      name: 'translate_text',
      description: 'Translate a text to a target language using the configured AI provider. Returns only the translated text.',
      parameters: {
        type: 'object',
        properties: {
          text: str('The text to translate'),
          targetLanguage: str('Target language name or locale code, e.g. "French" or fr-FR'),
          context: str('Optional context (e.g. "App Store description of a travel app", "max 30 chars")'),
        },
        required: ['text', 'targetLanguage'],
      },
      execute: async ({ text, targetLanguage, context }) => {
        const systemMessage = 'You are a professional app localization translator. Translate accurately, keep the tone, respect any length constraints, and preserve placeholders, emoji and line breaks.'
        const userMessage = `Translate the following text to ${targetLanguage}.${context ? `\nContext: ${context}` : ''}\n\nText:\n${text}\n\nRespond with ONLY the translated text, no explanations.`
        const translation = await callChatCompletion(ctx.aiConfig, systemMessage, userMessage, false)
        return { translation: translation.trim(), targetLanguage }
      },
    },
    {
      name: 'xcstrings_get_stats',
      description: 'Get statistics about the .xcstrings file currently loaded on the XCStrings page (total strings, languages, per-language translated/missing counts).',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => {
        if (!ctx.xcstringsData) {
          throw new Error('No .xcstrings file is loaded. Ask the user to load one on the XCStrings page first.')
        }
        return { fileName: ctx.fileName || null, ...getTranslationStats(ctx.xcstringsData) }
      },
    },
  ]
}

// Static views of the registry (executors are never invoked here)
export const AGENT_TOOL_COUNT = buildAgentTools({}).length
export const WRITE_TOOL_NAMES = new Set(
  buildAgentTools({}).filter((t) => t.write).map((t) => t.name)
)

/**
 * System prompt for the agent, reflecting what is currently connected.
 */
export function buildAgentSystemPrompt({ ascConfigured, gpConfigured, xcstringsFileName, appCompeteConfigured }) {
  return `You are the built-in automation agent of xcstrings-localizer, a localization tool for iOS and Android apps. You help the user inspect and update their App Store Connect metadata, Google Play store listings, ASO keywords, and translations, by calling the available tools.

Current environment:
- App Store Connect: ${ascConfigured ? 'configured (credentials available)' : 'NOT configured — the user must connect in the sidebar before ASC tools can work'}
- Google Play: ${gpConfigured ? 'configured (service account loaded)' : 'NOT configured — the user must load a service account in the sidebar before Google Play tools can work'}
- AppCompete (ASO): ${appCompeteConfigured ? 'configured (API key available)' : 'NOT configured — the user must enter their AppCompete API key in the sidebar before ASO tools can work'}
- Loaded .xcstrings file: ${xcstringsFileName || 'none'}

Rules:
- Always fetch current data (lists, localizations, listings) before updating anything; never invent ids or locale codes.
- Before a write, briefly state what you are about to change. Write tools may require the user's approval in the UI; if an action is rejected, don't retry it — ask the user instead.
- Respect character limits: ASC description/whatsNew 4000, keywords 100, promotionalText 170, name/subtitle 30; Google Play title 30, shortDescription 80, fullDescription 4000.
- Use exact locale codes (fr-FR, de-DE, ja…). Check asc_list_locales when unsure.
- Google Play write tools publish immediately (the edit is committed).
- When the user asks for feedback on their App Store screenshots (design, localization issues, quality), call asc_list_screenshots for the relevant locale — the screenshots are attached to the result as images that you can see. Give concrete, per-screenshot advice.
- For ASO work (keyword audits, suggestions, competitor research), use the aso_* tools. The numeric app id from asc_list_apps is the appleId these tools expect. Combine aso_get_app_keywords / aso_get_keyword_suggestions with the App Store keywords field (asc_get_version_localization) when suggesting keyword changes.
- Be concise. Answer in the user's language.`
}
