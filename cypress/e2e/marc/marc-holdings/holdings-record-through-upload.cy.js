import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const fileName = `autotest1Bib${getRandomPostfix()}.mrc`;
    const marcFile = 'oneMarcBib.mrc';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const propertyName = 'relatedInstanceInfo';
    let createdInstanceID;
    let holdingsID;

    before(() => {
      cy.loginAsAdmin();
      // required with special tests, but when step into test I see 403 some time in /metadata-provider/jobExecutions request
      cy.getAdminToken();

      DataImport.uploadFileViaApi(
        marcFile,
        fileName,
        jobProfileToRun,
      ).then((response) => {
        response.entries.forEach((record) => {
          createdInstanceID = record[propertyName].idList[0];
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      cy.deleteHoldingRecordViaApi(holdingsID);
      InventoryInstance.deleteInstanceViaApi(createdInstanceID);
    });

    it(
      'C345408 MARC instance record + FOLIO holdings record (Regression) (spitfire)',
      { tags: ['smoke', 'spitfire'] },
      () => {
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(createdInstanceID);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.createHoldingsRecord();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.getId().then((id) => {
          holdingsID = id;
        });
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
      }
    );
  });
});
