import { acquisitionUnits, organizations, organizationTypes, settingsEntries } from '../routes';
import { tagsDependency } from './common';

export const organizationsProfile = {
  filters: [acquisitionUnits, organizationTypes, settingsEntries],
  results: [organizations],
  responseDependencies: [tagsDependency],
};
