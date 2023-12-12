import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import features from '../../../support/dictionary/features';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';

describe('Manage holding records with FOLIO source', { retries: 2 }, () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.visit(TopMenu.inventoryPath);
    const InventoryNewInstance = InventoryInstances.addNewInventory();
    cy.wait(2000);
    InventoryNewInstance.fillRequiredValues();
    InventoryNewInstance.clickSaveAndCloseButton();
  });
  it(
    'C345406 FOLIO instance record + FOLIO holdings record (Regression) (spitfire)',
    { tags: ['smoke', 'spitfire', features.holdingsRecord] },
    () => {
      InventoryInstance.createHoldingsRecord('Migration (Migration) ');
      InventoryInstance.openHoldingView();
      HoldingsRecordView.checkSource('FOLIO');
      HoldingsRecordView.checkActionsMenuOptionsInFolioSource();
      HoldingsRecordView.edit();
      HoldingsRecordEdit.waitLoading();
      HoldingsRecordEdit.checkReadOnlyFields();
      HoldingsRecordEdit.closeWithoutSave();
      InventoryInstance.openHoldingView();
      HoldingsRecordView.tryToDelete();
      HoldingsRecordView.duplicate();
      InventoryNewHoldings.checkSource();
      // TODO: clarify what is "Verify that you are able to add or access an item" and "Behavior is no different than what FOLIO currently supports" in TestRail
    },
  );
});
