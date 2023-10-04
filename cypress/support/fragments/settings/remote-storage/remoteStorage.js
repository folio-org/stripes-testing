import { NavListItem, Pane } from '../../../../../interactors';

const remoteStorageNavigationPane = Pane('Remote storage');
const configurationsItem = NavListItem('Configurations');
const accessionTablesItem = NavListItem('Accession tables');

export default {
  checkSettingItems() {
    cy.expect([
      remoteStorageNavigationPane.find(configurationsItem).exists(),
      remoteStorageNavigationPane.find(accessionTablesItem).exists(),
    ]);
  },
  goToConfigurations() {
    cy.do(configurationsItem.click());
  },
};
