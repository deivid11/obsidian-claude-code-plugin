/**
 * Internationalization (i18n) module for Claude Code plugin
 */

import { en, TranslationKey } from './locales/en';
import { zh } from './locales/zh';
import { es } from './locales/es';
import { de } from './locales/de';
import { pt } from './locales/pt';

export type Locale = 'en' | 'zh' | 'es' | 'de' | 'pt';

type TranslationMap = Record<TranslationKey, string>;

const translations: Record<Locale, TranslationMap> = {
    en: en as TranslationMap,
    zh: zh as TranslationMap,
    es: es as TranslationMap,
    de: de as TranslationMap,
    pt: pt as TranslationMap,
};

let currentLocale: Locale = 'en';

/**
 * Set the current locale
 */
export function setLocale(locale: Locale): void {
    if (translations[locale]) {
        currentLocale = locale;
    } else {
        console.warn(`[i18n] Unknown locale: ${locale}, falling back to 'en'`);
        currentLocale = 'en';
    }
}

/**
 * Get the current locale
 */
export function getLocale(): Locale {
    return currentLocale;
}

/**
 * Get available locales
 */
export function getAvailableLocales(): { code: Locale; name: string }[] {
    return [
        { code: 'en', name: 'English' },
        { code: 'zh', name: '中文 (简体)' },
        { code: 'es', name: 'Español' },
        { code: 'de', name: 'Deutsch' },
        { code: 'pt', name: 'Português' },
    ];
}

/**
 * Translate a key to the current locale
 * @param key The translation key
 * @param params Optional parameters for string interpolation
 * @returns The translated string
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = translations[currentLocale]?.[key] || translations['en'][key] || key;

    // Handle parameter substitution
    if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
            text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
        });
    }

    return text;
}

/**
 * Initialize i18n with system/Obsidian locale detection
 */
export function initI18n(preferredLocale?: string): void {
    if (preferredLocale && translations[preferredLocale as Locale]) {
        setLocale(preferredLocale as Locale);
        return;
    }

    // Try to detect from Obsidian's locale or system
    const systemLocale = navigator.language?.toLowerCase() || '';

    if (systemLocale.startsWith('zh')) {
        setLocale('zh');
    } else if (systemLocale.startsWith('es')) {
        setLocale('es');
    } else if (systemLocale.startsWith('de')) {
        setLocale('de');
    } else if (systemLocale.startsWith('pt')) {
        setLocale('pt');
    } else {
        setLocale('en');
    }
}

// Re-export types
export type { TranslationKey };