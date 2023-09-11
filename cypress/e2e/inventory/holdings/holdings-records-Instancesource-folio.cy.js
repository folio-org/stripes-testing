import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import testTypes from '../../../support/dictionary/testTypes';
import features from '../../../support/dictionary/features';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import DevTeams from '../../../support/dictionary/devTeams';

describe('Manage holding records with FOLIO source', { retries: 2 }, () => {
  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
    InventoryInstances.add();
  });
  it(
    'C345406 FOLIO instance record + FOLIO holdings record (Regression) (spitfire)',
    { tags: [testTypes.smoke, DevTeams.spitfire, features.holdingsRecord] },
    () => {
      InventoryInstance.createHoldingsRecord();
      InventoryInstance.openHoldingView();
      HoldingsRecordView.checkSource('FOLIO');
      HoldingsRecordView.checkActionsMenuOptionsInFolioSource();
      HoldingsRecordView.edit();
      HoldingsRecordEdit.waitLoading();
      HoldingsRecordEdit.checkReadOnlyFields();
      HoldingsRecordEdit.closeWithoutSave();
      HoldingsRecordView.tryToDelete();
      HoldingsRecordView.duplicate();
      InventoryNewHoldings.checkSource();
      // TODO: clarify what is "Verify that you are able to add or access an item" and "Behavior is no different than what FOLIO currently supports" in TestRail
    },
  );
});
