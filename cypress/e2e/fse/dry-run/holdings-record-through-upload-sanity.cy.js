import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../support/utils/users';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const { user, memberTenant } = parseSanityParameters();
    const fileName = `autotest1Bib${getRandomPostfix()}.mrc`;
    const marcFile = 'oneMarcBib.mrc';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const propertyName = 'instance';
    let createdInstanceID = null;
    let holdingsID = null;

    before('Setup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });
      DataImport.uploadFileViaApi(marcFile, fileName, jobProfileToRun)
        .then((response) => {
          response.forEach((record) => {
            createdInstanceID = record[propertyName].id;
          });
        })
        .then(() => {
          cy.allure().logCommandSteps(false);
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.allure().logCommandSteps();
        });
    });

    after('Cleanup', () => {
      cy.getUserToken(user.username, user.password, { log: false });
      if (holdingsID) {
        cy.deleteHoldingRecordViaApi(holdingsID);
      }
      if (createdInstanceID) {
        InventoryInstance.deleteInstanceViaApi(createdInstanceID);
      }
    });

    it(
      'C345408 MARC instance record + FOLIO holdings record (Regression) (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C345408'] },
      () => {
        InventoryInstances.searchByTitle(createdInstanceID);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.createHoldingsRecord();
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
      },
    );
  });
});
