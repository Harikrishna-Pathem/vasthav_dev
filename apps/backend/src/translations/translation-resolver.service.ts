import { UserLanguage } from '@prisma/client';

export type TranslationEntry = {
  language: UserLanguage;
  text?: string | null;
  name?: string | null;
  description?: string | null;
  value?: string | null;
};

export interface TranslationResolutionResult {
  language: UserLanguage;
  text: string;
}

export class TranslationResolverService {
  private canonicalLanguages: UserLanguage[] = [UserLanguage.en, UserLanguage.te, UserLanguage.hi];

  resolveLanguage(args: {
    requestedLanguage?: UserLanguage | string;
    userPreferredLanguage?: UserLanguage | string;
    available: TranslationEntry[];
  }): TranslationResolutionResult {
    const requested = this.normalizeLanguage(args.requestedLanguage);
    const preferred = this.normalizeLanguage(args.userPreferredLanguage);
    const ordered = this.buildLanguageOrder(requested ?? preferred ?? UserLanguage.en);

    for (const language of ordered) {
      const entry = args.available.find((item) => item.language === language);
      const text = this.extractText(entry);
      if (text) {
        return { language, text };
      }
    }

    const fallback = args.available.find((item) => item.language === UserLanguage.en) ?? args.available[0];
    const fallbackText = this.extractText(fallback) ?? '';
    return { language: fallback?.language ?? UserLanguage.en, text: fallbackText };
  }

  private buildLanguageOrder(primary: UserLanguage): UserLanguage[] {
    const ordered: UserLanguage[] = [];
    for (const language of [primary, UserLanguage.en, UserLanguage.te, UserLanguage.hi]) {
      if (language && !ordered.includes(language)) {
        ordered.push(language);
      }
    }
    return ordered;
  }

  private normalizeLanguage(language?: UserLanguage | string): UserLanguage | undefined {
    if (!language) return undefined;
    const normalized = String(language).toLowerCase();
    if (normalized === UserLanguage.en) return UserLanguage.en;
    if (normalized === UserLanguage.te) return UserLanguage.te;
    if (normalized === UserLanguage.hi) return UserLanguage.hi;
    return undefined;
  }

  private extractText(entry?: TranslationEntry): string | null {
    if (!entry) return null;
    const text = entry.text ?? entry.name ?? entry.value ?? entry.description ?? null;
    if (typeof text !== 'string') return null;
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
