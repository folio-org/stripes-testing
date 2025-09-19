import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const fileName = `autotest1Bib${getRandomPostfix()}.mrc`;
    const marcFile = 'oneMarcBib.mrc';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const propertyName = 'instance';
    let createdInstanceID;
    let holdingsID;

    before(() => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(marcFile, fileName, jobProfileToRun).then((response) => {
        response.forEach((record) => {
          createdInstanceID = record[propertyName].id;
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
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C345408'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
        InventoryInstances.searchByTitle(createdInstanceID);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.createHoldingsRecord();
        cy.wait(3000);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.getId().then((id) => {
          holdingsID = id;
        });
        HoldingsRecordView.checkSource('FOLIO');
        HoldingsRecordView.validateOptionInActionsMenu([
          { optionName: 'View source', shouldExist: false },
          { optionName: 'Edit MARC bibliographic record', shouldExist: false },
        ]);
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.checkReadOnlyFields();
        HoldingsRecordEdit.closeWithoutSave();
        HoldingsRecordView.checkReadOnlyFields();
        HoldingsRecordView.tryToDelete();
        HoldingsRecordView.duplicate();
        InventoryNewHoldings.checkSource();
        // TODO: clarify what is "Verify that you are able to add or access an item" and "Behavior is no different than what FOLIO currently supports" in TestRail
      },
    );
  });
});
