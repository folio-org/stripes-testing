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
      tag001: '001',
      tag001value: '$a Second 001 field',
      tag852: '852',
      tag853: '853',
      tag853value: 'C356543 statement',
    };

    const marcFile = {
      marc: 'marcBibFileC387461.mrc',
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
      });

      cy.getAdminToken();
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
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
        InventoryInstances.searchByTitle(recordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.updateExistingField(testData.tag852, QuickMarcEditor.getExistingLocation());
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();

        HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
          recordIDs.push(holdingsID);
        });

        cy.login(createdUserProperties.username, createdUserProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        cy.waitForAuthRefresh(() => {
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
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
      'C358991 Verify that field which moved above "852" retains all values in the subfield text box when edit "MARC Holdings" record (Spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C358991'] },
      () => {
        InventoryInstances.searchByTitle(recordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkSource(INSTANCE_SOURCE_NAMES.MARC);
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
      { tags: ['criticalPath', 'spitfire', 'C387461'] },
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
        QuickMarcEditor.updateExistingField('', testData.tag001value);
        QuickMarcEditor.updateTagNameToLockedTag(6, '001');
        QuickMarcEditor.checkFourthBoxEditable(6, false);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.checkReadOnlyTags();
        QuickMarcEditor.verifyNoFieldWithContent(testData.tag001value);
      },
    );

    it(
      'C356843 [quickMARC] Verify that the "Save & close" button enabled when user make changes in the record. (Spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C356843'] },
      () => {
        InventoryInstances.searchBySource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstances.searchByTitle(recordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        cy.wait(2000);
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
