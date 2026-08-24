import { acquisitionUnits, organizations, organizationTypes } from '../routes';
import { tagFilterRoutes } from './common';

/** Organizations has conditional tag data but no result-reference requests. */
export const organizationsProfile = {
  filters: [acquisitionUnits, organizationTypes, ...tagFilterRoutes],
  results: [organizations],
};
