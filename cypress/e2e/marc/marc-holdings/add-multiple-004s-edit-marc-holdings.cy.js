import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      tag004: '004',
      tag004value: '$a Test',
      tag852: '852',
      errorMessage: 'Record cannot be saved. Can only have one MARC 004.',
    };

    const marcFile = {
      marc: 'marcBibFileC345399.mrc',
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      numOfRecords: 1,
      propertyName: 'instance',
    };

    const recordIDs = [];

    beforeEach('Creating user, data', () => {
      cy.getAdminToken();
      marcFile.fileName = `testMarcFile.editMarcHoldings.${getRandomPostfix()}.mrc`;
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        cy.then(() => {
          cy.getUserToken(userProperties.username, userProperties.password);
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              recordIDs.push(record[marcFile.propertyName].id);
            });
          });
        }).then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
          ]).then((createdUserProperties) => {
            testData.createdUserProperties = createdUserProperties;
            cy.waitForAuthRefresh(() => {
              cy.loginAsAdmin({
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(recordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.goToMarcHoldingRecordAdding();
            QuickMarcEditor.updateExistingField(
              testData.tag852,
              QuickMarcEditor.getExistingLocation(),
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveHoldings();

            HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
              recordIDs.push(holdingsID);
            });
            cy.waitForAuthRefresh(() => {
              cy.login(createdUserProperties.username, createdUserProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });
      });
    });

    afterEach('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(testData.createdUserProperties.userId);
      cy.deleteHoldingRecordViaApi(recordIDs[1]);
      InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
      recordIDs.length = 0;
    });

    it(
      'C345399 Add multiple MARC 004s when editing "MARC Holdings" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C345399'] },
      () => {
        InventoryInstances.searchBySource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstances.searchByTitle(recordIDs[0]);
        InventoryInstances.selectInstance();
        cy.wait(1000);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkSource(INSTANCE_SOURCE_NAMES.MARC);
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.addEmptyFields(5);
        QuickMarcEditor.checkEmptyFieldAdded(6);
        QuickMarcEditor.updateExistingField('', testData.tag004value);
        QuickMarcEditor.updateTagNameToLockedTag(6, '004');
        QuickMarcEditor.checkFourthBoxEditable(6, false);
        QuickMarcEditor.pressSaveAndCloseButton();

        // Verify error message for multiple 004 fields
        QuickMarcEditor.checkErrorMessage(6, testData.errorMessage);

        // Cancel and close without saving
        QuickMarcEditor.closeWithoutSavingAfterChange();

        // Verify no changes were made by viewing source
        HoldingsRecordView.viewSource();
        QuickMarcEditor.verifyNoFieldWithContent(testData.tag004value);
      },
    );
  });
});
