import { Pane, NavListItem } from '../../../../../interactors';

export const PROFILE_TYPES = {
  HOLDINGS: 'Holdings bulk edit profiles',
  INSTANCES: 'Instances bulk edit profiles',
  ITEMS: 'Items bulk edit profiles',
  USERS: 'Users bulk edit profiles',
};

const bulkEditPane = Pane('Bulk edit');
const navListItems = {
  holdings: bulkEditPane.find(NavListItem(PROFILE_TYPES.HOLDINGS)),
  instances: bulkEditPane.find(NavListItem(PROFILE_TYPES.INSTANCES)),
  items: bulkEditPane.find(NavListItem(PROFILE_TYPES.ITEMS)),
  users: bulkEditPane.find(NavListItem(PROFILE_TYPES.USERS)),
};

export default {
  waitLoading() {
    cy.expect(bulkEditPane.exists());
  },

  verifyBulkEditPaneIsEmpty() {
    Object.values(navListItems).forEach((item) => cy.expect(item.absent()));
  },

  verifyProfilesTypesPresent(profiles) {
    cy.get('#app-settings-nav-pane')
      .find('[class^=NavListItem-]')
      .then(($items) => {
        const itemTexts = $items.map((i, el) => Cypress.$(el).text()).get();
        expect(itemTexts).to.deep.equal(profiles);
      });
  },

  verifyProfilesTypesAbsent(profiles) {
    cy.get('#app-settings-nav-pane')
      .find('[class^=NavListItem-]')
      .then(($items) => {
        const itemTexts = $items.map((i, el) => Cypress.$(el).text()).get();

        profiles.forEach((profile) => {
          expect(itemTexts).to.not.include(profile);
        });
      });
  },

  clickItemsBulkEditProfiles() {
    cy.do(navListItems.items.click());
  },

  clickHoldingsBulkEditProfiles() {
    cy.do(navListItems.holdings.click());
  },

  clickUsersBulkEditProfiles() {
    cy.do(navListItems.users.click());
  },

  clickInstancesBulkEditProfiles() {
    cy.do(navListItems.instances.click());
  },
};
