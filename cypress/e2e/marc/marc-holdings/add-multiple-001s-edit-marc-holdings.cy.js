import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
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
      tag001: '001',
      tag001value: '$a Second 001 field',
      tag852: '852',
      tag853: '853',
      tag853value: 'C356543 statement',
    };

    const marcFile = {
      marc: 'marcBibFileC387461.mrc',
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    };

    const recordIDs = [];

    beforeEach('Creating user, data', () => {
      marcFile.fileName = `testMarcFile.editMarcHoldings.${getRandomPostfix()}.mrc`;
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.createdUserProperties = createdUserProperties;

        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            Logs.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(marcFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              recordIDs.push(link.split('/')[5]);
              cy.visit(TopMenu.inventoryPath).then(() => {
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
              });
            });
            cy.login(createdUserProperties.username, createdUserProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          },
        );
      });
    });

    afterEach('Deleting created user, data', () => {
      cy.loginAsAdmin();
      Users.deleteViaApi(testData.createdUserProperties.userId);
      cy.deleteHoldingRecordViaApi(recordIDs[1]);
      InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
      recordIDs.length = 0;
    });

    it(
      'C358991 Verify that field which moved above "852" retains all values in the subfield text box when edit "MARC Holdings" record (Spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'nonParallel'] },
      () => {
        InventoryInstances.searchBySource('MARC');
        InventoryInstances.searchByTitle(recordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkSource('MARC');
        // "Edit in quickMARC" option might not be active immediately when opening MARC Holdings
        // this option becomes active after reopening Holdings view window
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.addEmptyFields(5);
        QuickMarcEditor.checkEmptyFieldAdded(6);
        QuickMarcEditor.updateExistingField('', testData.tag001value);
        QuickMarcEditor.checkContent(testData.tag001value, 6);
        QuickMarcEditor.moveFieldUp(6);
        QuickMarcEditor.checkContent(testData.tag001value, 5);
        QuickMarcEditor.checkContent(QuickMarcEditor.getExistingLocation(), 6);
      },
    );

    it(
      'C387461 Add multiple 001s when editing "MARC Holdings" record (Spitfire)',
      { tags: ['criticalPath', 'spitfire', 'nonParallel'] },
      () => {
        InventoryInstances.searchBySource('MARC');
        InventoryInstances.searchByTitle(recordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkSource('MARC');
        // "Edit in quickMARC" option might not be active immediately when opening MARC Holdings
        // this option becomes active after reopening Holdings view window
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.addEmptyFields(5);
        QuickMarcEditor.checkEmptyFieldAdded(6);
        QuickMarcEditor.updateExistingField('', testData.tag001value);
        QuickMarcEditor.updateTagNameToLockedTag(6, '001');
        QuickMarcEditor.checkFourthBoxDisabled(6);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.checkReadOnlyTags();
        QuickMarcEditor.verifyNoFieldWithContent(testData.tag001value);
      },
    );

    it(
      'C356843 [quickMARC] Verify that the "Save & close" button enabled when user make changes in the record. (Spitfire)',
      { tags: ['criticalPath', 'spitfire', 'nonParallel'] },
      () => {
        InventoryInstances.searchBySource('MARC');
        InventoryInstances.searchByTitle(recordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        // "Edit in quickMARC" option might not be active immediately when opening MARC Holdings - re-opening activates it
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkSource('MARC');
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.editInQuickMarc();
        // adding a non-required field to delete it later, and saving
        QuickMarcEditor.addEmptyFields(5);
        QuickMarcEditor.checkEmptyFieldAdded(6);
        QuickMarcEditor.updateExistingTagValue(6, testData.tag853);
        QuickMarcEditor.updateExistingField(testData.tag853, `$a ${testData.tag853value}`);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();

        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.addEmptyFields(6);
        QuickMarcEditor.checkEmptyFieldAdded(7);
        QuickMarcEditor.checkButtonSaveAndCloseEnable();
        QuickMarcEditor.addEmptyFields(6);
        QuickMarcEditor.checkEmptyFieldAdded(8);
        QuickMarcEditor.checkButtonSaveAndCloseEnable();
        QuickMarcEditor.addEmptyFields(6);
        QuickMarcEditor.checkEmptyFieldAdded(9);
        QuickMarcEditor.checkButtonSaveAndCloseEnable();
        QuickMarcEditor.deleteFieldAndCheck(6, testData.tag853);
        QuickMarcEditor.afterDeleteNotification(testData.tag853);
        QuickMarcEditor.checkButtonSaveAndCloseEnable();
        QuickMarcEditor.deleteField(7);
        QuickMarcEditor.checkButtonSaveAndCloseEnable();
        // here and below - wait until deleted empty field is not shown
        cy.wait(1000);
        QuickMarcEditor.deleteField(7);
        QuickMarcEditor.checkButtonSaveAndCloseEnable();
        cy.wait(1000);
        QuickMarcEditor.deleteFieldAndCheck(7, '');
        QuickMarcEditor.checkButtonSaveAndCloseEnable();
        QuickMarcEditor.clickSaveAndCloseThenCheck(1);
        QuickMarcEditor.confirmDelete();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.checkHoldingsStatementAbsent(testData.tag853value);
      },
    );
  });
});
