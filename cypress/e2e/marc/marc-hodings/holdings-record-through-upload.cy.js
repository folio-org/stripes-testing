import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';

describe('MARC -> MARC Holdings', () => {
  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    // required with special tests, but when step into test I see 403 some time in /metadata-provider/jobExecutions request
    cy.getAdminToken();
  });

  it(
    'C345408 MARC instance record + FOLIO holdings record (Regression) (spitfire)',
    { tags: ['smoke', 'spitfire'] },
    () => {
      DataImport.uploadMarcBib().then((instanceRecordHrId) => {
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceRecordHrId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.createHoldingsRecord();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkSource('FOLIO');
        HoldingsRecordView.checkActionsMenuOptionsInFolioSource();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.checkReadOnlyFields();
        HoldingsRecordEdit.closeWithoutSave();
        HoldingsRecordView.checkReadOnlyFields();
        HoldingsRecordView.tryToDelete();
        HoldingsRecordView.duplicate();
        InventoryNewHoldings.checkSource();
        // TODO: clarify what is "Verify that you are able to add or access an item" and "Behavior is no different than what FOLIO currently supports" in TestRail
      });
    },
  );
});
