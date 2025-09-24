import { Pane, NavListItem } from '../../../../../interactors';

const bulkEditPane = Pane('Bulk edit');
const navListItems = {
  holdings: bulkEditPane.find(NavListItem('Holdings bulk edit profiles')),
  instance: bulkEditPane.find(NavListItem('Instance bulk edit profiles')),
  item: bulkEditPane.find(NavListItem('Item bulk edit profiles')),
  user: bulkEditPane.find(NavListItem('User bulk edit profiles')),
};

export default {
  waitLoading() {
    cy.expect(bulkEditPane.exists());
  },

  verifyBulkEditPaneIsEmpty() {
    Object.values(navListItems).forEach((item) => cy.expect(item.absent()));
  },
};
