import { settingsEntries, tags } from '../routes';

/**
 * Applications request the setting first and request tag options only when the
 * setting enables the filter. Filter tracking waits for whichever of these
 * routes the UI actually emits, so no runtime condition is necessary.
 */
export const tagFilterRoutes = [settingsEntries, tags];
