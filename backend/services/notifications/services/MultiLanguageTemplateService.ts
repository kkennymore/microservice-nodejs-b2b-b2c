import handlebars from 'handlebars';
import { TemplateTranslationModel } from '@/models/index.js';

class MultiLanguageTemplateService {
  constructor() {
    this.translations = new Map(); // templateId -> language -> compiled template
    this.initializeTranslations();
  }

  // Initialize template translations
  async initializeTranslations() {
    try {
      const translations = await TemplateTranslationModel.findAllActive();

      for (const translation of translations) {
        if (!this.translations.has(translation.template_id)) {
          this.translations.set(translation.template_id, new Map());
        }

        const compiled = {
          subject: translation.subject ? handlebars.compile(translation.subject) : null,
          content: handlebars.compile(translation.content),
          variables: translation.variables
        };

        this.translations.get(translation.template_id).set(translation.language_code, compiled);
      }

      console.log(`🌍 Loaded ${translations.length} template translations`);
    } catch (error) {
      console.error('Failed to initialize template translations:', error);
    }
  }

  // Get template in specific language
  async getTemplate(templateId, languageCode = 'en') {
    try {
      // Try requested language first
      if (this.translations.has(templateId) && this.translations.get(templateId).has(languageCode)) {
        return this.translations.get(templateId).get(languageCode);
      }

      // Fall back to English
      if (this.translations.has(templateId) && this.translations.get(templateId).has('en')) {
        return this.translations.get(templateId).get('en');
      }

      // No translation found
      return null;
    } catch (error) {
      console.error('Get template error:', error);
      return null;
    }
  }

  // Render template with data
  async renderTemplate(templateId, languageCode, templateData = {}) {
    try {
      const template = await this.getTemplate(templateId, languageCode);

      if (!template) {
        throw new Error(`Template ${templateId} not found for language ${languageCode}`);
      }

      const subject = template.subject ? template.subject(templateData) : null;
      const content = template.content(templateData);

      return {
        subject,
        content,
        language: languageCode,
        template_id: templateId
      };
    } catch (error) {
      console.error('Render template error:', error);
      throw error;
    }
  }

  // Add template translation
  async addTranslation(translationData) {
    try {
      const {
        template_id,
        language_code,
        subject,
        content,
        variables = []
      } = translationData;

      const translationId = await TemplateTranslationModel.create({
        template_id,
        language_code,
        subject,
        content,
        variables
      });

      // Update cache
      await this.initializeTranslations();

      console.log(`🌍 Added translation for template ${template_id} in ${language_code}`);

      return translationId;
    } catch (error) {
      console.error('Add translation error:', error);
      throw new Error('Failed to add template translation');
    }
  }

  // Update template translation
  async updateTranslation(translationId, translationData) {
    try {
      const success = await TemplateTranslationModel.update(translationId, translationData);

      if (success) {
        // Update cache
        await this.initializeTranslations();
        console.log(`🌍 Updated translation ${translationId}`);
      }

      return success;
    } catch (error) {
      console.error('Update translation error:', error);
      throw new Error('Failed to update template translation');
    }
  }

  // Delete template translation
  async deleteTranslation(translationId) {
    try {
      const success = await TemplateTranslationModel.delete(translationId);

      if (success) {
        // Update cache
        await this.initializeTranslations();
        console.log(`🌍 Deleted translation ${translationId}`);
      }

      return success;
    } catch (error) {
      console.error('Delete translation error:', error);
      throw new Error('Failed to delete template translation');
    }
  }

  // Get available languages for template
  getAvailableLanguages(templateId) {
    if (!this.translations.has(templateId)) {
      return [];
    }

    return Array.from(this.translations.get(templateId).keys());
  }

  // Get all supported languages
  getSupportedLanguages() {
    const languages = new Set();

    for (const [templateId, langMap] of this.translations.entries()) {
      for (const langCode of langMap.keys()) {
        languages.add(langCode);
      }
    }

    return Array.from(languages).sort();
  }

  // Detect user language preference (simplified)
  detectUserLanguage(userPreferences = {}, acceptLanguage = '') {
    // Check user preferences first
    if (userPreferences.language) {
      return userPreferences.language;
    }

    // Parse Accept-Language header
    if (acceptLanguage) {
      const primaryLang = acceptLanguage.split(',')[0].split('-')[0];
      if (this.getSupportedLanguages().includes(primaryLang)) {
        return primaryLang;
      }
    }

    // Default to English
    return 'en';
  }

  // Get template statistics
  async getTemplateStats() {
    try {
      const stats = await TemplateTranslationModel.getStats();

      return {
        total_templates: stats.total_templates,
        total_translations: stats.total_translations,
        supported_languages: this.getSupportedLanguages(),
        translations_per_language: stats.translations_per_language
      };
    } catch (error) {
      console.error('Get template stats error:', error);
      throw error;
    }
  }

  // Reload translations cache
  async reloadTranslations() {
    this.translations.clear();
    await this.initializeTranslations();
  }
}

export default new MultiLanguageTemplateService();