import { Pane, NavListItem } from '../../../../../interactors';

const bulkEditPane = Pane('Bulk edit');
const navListItems = {
  holdings: bulkEditPane.find(NavListItem('Holdings bulk edit profiles')),
  instances: bulkEditPane.find(NavListItem('Instances bulk edit profiles')),
  items: bulkEditPane.find(NavListItem('Items bulk edit profiles')),
  users: bulkEditPane.find(NavListItem('Users bulk edit profiles')),
};

export default {
  waitLoading() {
    cy.expect(bulkEditPane.exists());
  },

  verifyBulkEditPaneIsEmpty() {
    Object.values(navListItems).forEach((item) => cy.expect(item.absent()));
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
