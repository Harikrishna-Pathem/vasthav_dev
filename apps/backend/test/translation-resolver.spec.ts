import { TranslationResolverService } from '../src/translations/translation-resolver.service.js';
import { UserLanguage } from '@prisma/client';
describe('TranslationResolverService', () => {
  let service: TranslationResolverService;
  beforeEach(() => {
    service = new TranslationResolverService();
  });
  it('prefers the explicit language over the user preference', () => {
    const resolved = service.resolveLanguage({
      requestedLanguage: UserLanguage.te,
      userPreferredLanguage: UserLanguage.hi,
      available: [
        { language: UserLanguage.en, text: 'What is your name?' },
        { language: UserLanguage.te, text: 'మీ పేరు ఏమిటి?' },
        { language: UserLanguage.hi, text: 'आपका नाम क्या है?' },
      ],
    });
    expect(resolved).toEqual({ text: 'మీ పేరు ఏమిటి?', language: UserLanguage.te });
  });
  it('falls back to English when Telugu is missing', () => {
    const resolved = service.resolveLanguage({
      requestedLanguage: UserLanguage.te,
      userPreferredLanguage: UserLanguage.te,
      available: [
        { language: UserLanguage.en, text: 'What is your name?' },
        { language: UserLanguage.hi, text: 'आपका नाम क्या है?' },
      ],
    });
    expect(resolved).toEqual({ text: 'What is your name?', language: UserLanguage.en });
  });
  it('falls back to the user preferred language when requested language is absent', () => {
    const resolved = service.resolveLanguage({
      requestedLanguage: undefined,
      userPreferredLanguage: UserLanguage.hi,
      available: [
        { language: UserLanguage.en, text: 'What is your name?' },
        { language: UserLanguage.hi, text: 'आपका नाम क्या है?' },
      ],
    });
    expect(resolved).toEqual({ text: 'आपका नाम क्या है?', language: UserLanguage.hi });
  });
});
