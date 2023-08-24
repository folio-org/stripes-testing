import { Campuses, Institutions, Libraries, Locations } from './location-setup';
import { NavListItem, Pane } from '../../../../../interactors';

export const TENANTS = {
  // General
  ADDRESSES: 'Addresses',
  LANGUAGE_AND_LOCALIZATIONS: 'Language and localiozations',
  PREFERRED_PLUGINS: 'Preferred plugins',
  SSO_SETTINGS: 'SSO settings',
  SERVICE_POINTS: 'Service points',
  // Location setup
  INSTITUTIONS: 'Institutions',
  CAMPUSES: 'Campuses',
  LIBRARIES: 'Libraries',
  LOCATIONS: 'Locations',
};

const tenantSections = {
  [TENANTS.INSTITUTIONS]: Institutions,
  [TENANTS.CAMPUSES]: Campuses,
  [TENANTS.LIBRARIES]: Libraries,
  [TENANTS.LOCATIONS]: Locations,
};

export default {
  waitLoading(section = 'Tenant') {
    cy.expect(Pane(section).exists());
  },
  selectTenant(section) {
    cy.do(NavListItem(section).click());
    cy.expect(Pane(section).exists());

    return tenantSections[section];
  },
};
