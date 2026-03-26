import { useStorage } from '../contexts/StorageContext';
import { en, de, type Translations } from './translations';

export function useT(): Translations {
  const { settings } = useStorage();
  return settings.uiLanguage === 'de' ? de : en;
}
