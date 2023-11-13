import { Addresses, Localization } from './general';
import { Campuses, Institutions, Libraries, Locations } from './location-setup';
import { NavListItem, Pane } from '../../../../../interactors';

export const TENANTS = {
  // General
  ADDRESSES: 'Addresses',
  LANGUAGE_AND_LOCALIZATION: 'Language and localization',
  PREFERRED_PLUGINS: 'Preferred plugins',
  SSO_SETTINGS: 'SSO settings',
  SERVICE_POINTS: 'Service points',
  // Location setup
  INSTITUTIONS: 'Institutions',
  CAMPUSES: 'Campuses',
  LIBRARIES: 'Libraries',
  LOCATIONS: 'Locations',
};

export default {
  waitLoading(section = 'Tenant') {
    cy.expect(Pane(section).exists());
  },
  selectTenant(section) {
    cy.wait(2000);
    cy.do(NavListItem(section).click());
    cy.expect(Pane(section).exists());
  },
  goToTenantTab() {
    cy.do(NavListItem('Tenant').click());
    cy.expect(Pane('Tenant').exists());
  },
  verifyLocationSetupItems() {
    [TENANTS.INSTITUTIONS, TENANTS.CAMPUSES, TENANTS.LIBRARIES, TENANTS.LOCATIONS].forEach(
      (item) => {
        cy.expect(NavListItem(item).exists());
      },
    );
  },
  verifyNoGeneralItems() {
    [
      TENANTS.ADDRESSES,
      TENANTS.LANGUAGE_AND_LOCALIZATION,
      TENANTS.PREFERRED_PLUGINS,
      TENANTS.SSO_SETTINGS,
      TENANTS.SERVICE_POINTS,
    ].forEach((item) => {
      cy.expect(NavListItem(item).absent());
    });
  },
  verifyPageTitle(title) {
    cy.title().should('eq', title);
  },
};
