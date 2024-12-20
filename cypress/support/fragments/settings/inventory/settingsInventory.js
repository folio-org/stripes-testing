import { Pane, NavListItem } from '../../../../../interactors';
import FastAddNewRecord from '../../inventory/fastAddNewRecord';

const inventoryPane = Pane('Inventory');

export const INVENTORY_SETTINGS_TABS = {
  FAST_ADD: 'Fast add',
  MATERIAL_TYPES: 'Material types',
  TARGET_PROFILES: 'Z39.50 target profiles',
  URL_RELATIONSHIP: 'URL relationship',
  INSTANCE_STATUS_TYPE: 'Instance status types',
  LOAN_TYPES: 'Loan types',
  STATISTICAL_CODES: 'Statistical codes',
};

export default {
  selectSettingsTab(settingsTab) {
    cy.do(NavListItem(settingsTab).click());

    switch (settingsTab) {
      case INVENTORY_SETTINGS_TABS.FAST_ADD:
        return FastAddNewRecord;
      default:
        return this;
    }
  },
  goToSettingsInventory() {
    cy.do(NavListItem('Inventory').click());
    cy.expect(inventoryPane.exists());
  },

  goToSettingsInventoryNoInteractors() {
    cy.xpath("//a[contains(@href, '/settings/inventory')]").click();
    cy.xpath("//div[@id='paneHeaderapp-settings-nav-pane']").should('be.visible');
  },

  selectz3950ProfilesNoInteractors() {
    cy.xpath("//a[contains(@href, '/settings/inventory/targetProfiles')]").click();
  },
};
