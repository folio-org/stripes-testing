import { Pane, NavListItem } from '../../../../../interactors';
import FastAddNewRecord from '../../inventory/fastAddNewRecord';

const inventoryPane = Pane('Inventory');

export const SETTINGS_TABS = {
  FAST_ADD: 'Fast add',
  MATERIAL_TYPES: 'Material types',
};

export default {
  selectSettingsTab(settingsTab) {
    cy.do(NavListItem(settingsTab).click());

    switch (settingsTab) {
      case SETTINGS_TABS.FAST_ADD:
        return FastAddNewRecord;
      default:
        return this;
    }
  },
  goToSettingsInventory() {
    cy.do(NavListItem('Inventory').click());
    cy.expect(inventoryPane.exists());
    Object.values(SETTINGS_TABS).forEach((settingsTab) => {
      cy.expect(inventoryPane.find(NavListItem(settingsTab)).exists());
    });
  },
};
