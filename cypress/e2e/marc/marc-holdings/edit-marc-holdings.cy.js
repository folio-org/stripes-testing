import { JOB_STATUS_NAMES, RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    let user;
    let instanceHrid;
    const testData = {
      fileNameForCreateInstance: `C359241 autotestFileName.${getRandomPostfix()}`,
      fileNameForCreateHoldings: `C359241 autotestFileName.${getRandomPostfix()}`,
      fileName: `C359241 autotestFileName.${getRandomPostfix()}`,
      filePath: 'marcBibFileForC359241.mrc',
      jobProfileForRun: 'Default - Create Holdings and SRS MARC Holdings',
    };
    const fieldData = {
      firstFieldForAdding: { tag: '', content: '' },
      secondFieldForAdding: { tag: '151', content: '' },
      thirdFieldForAdding: { tag: '', content: 'Filled' },
      forthFieldForAdding: { tag: '400', content: 'Value' },
      fieldForDeleting: { tag: '871', content: '$8 0 $a v.1/50 (1950/1999)' },
      field861: { tag: '861', content: '$8 0 $a v.54-68 (2003-2017)', ind1: '4', ind2: '1' },
      field868: { tag: '868', content: '$8 0 $a test', ind1: '4', ind2: '1' },
      field856: { tag: '856', content: '$8 0 $a test1', ind1: '4', ind2: '1' },
      emptyField: { tag: '', content: '$8 0 $a v.1/50 (1950/1999)', ind1: '4', ind2: '1' },
      field035: { tag: '035', content: '$a 445553' },
      fieldForChecking: { tag: 866 },
    };

    before('create test data and login', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      DataImport.uploadFileViaApi('oneMarcBib.mrc', testData.fileNameForCreateInstance);
      JobProfiles.waitFileIsImported(testData.fileNameForCreateInstance);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(testData.fileNameForCreateInstance);
      FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
      InstanceRecordView.verifyInstancePaneExists();
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        instanceHrid = initialInstanceHrId;

        DataImport.editMarcFile(
          testData.filePath,
          testData.fileName,
          ['in11887186'],
          [initialInstanceHrId],
        );
      });
      // upload a marc file for creating holdings
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(testData.fileName, testData.fileNameForCreateHoldings);
      JobProfiles.waitLoadingList();
      JobProfiles.search(testData.jobProfileForRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(testData.fileNameForCreateHoldings);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      cy.logout();

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkHoldingRecordViewOpened();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
    });

    it(
      'C359241 Edit MARC Holdings | Displaying of placeholder message when user deletes a row (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.addNewField(
          fieldData.firstFieldForAdding.tag,
          fieldData.firstFieldForAdding.content,
          13,
        );
        QuickMarcEditor.checkContent(fieldData.firstFieldForAdding.content, 14);
        QuickMarcEditor.addNewField(
          fieldData.secondFieldForAdding.tag,
          fieldData.secondFieldForAdding.content,
          14,
        );
        QuickMarcEditor.checkContent(fieldData.secondFieldForAdding.content, 15);
        QuickMarcEditor.addNewField(
          fieldData.thirdFieldForAdding.tag,
          fieldData.thirdFieldForAdding.content,
          15,
        );
        QuickMarcEditor.checkContent(fieldData.thirdFieldForAdding.content, 16);
        QuickMarcEditor.addNewField(
          fieldData.forthFieldForAdding.tag,
          fieldData.forthFieldForAdding.content,
          16,
        );
        QuickMarcEditor.checkContent(fieldData.forthFieldForAdding.content, 17);
        QuickMarcEditor.checkButtonsEnabled();

        QuickMarcEditor.deleteField(14);
        cy.wait(1000);
        QuickMarcEditor.deleteField(14);
        cy.wait(1000);
        QuickMarcEditor.deleteField(14);
        cy.wait(1000);
        QuickMarcEditor.deleteField(14);
        cy.wait(1000);
        QuickMarcEditor.checkButtonsDisabled();

        QuickMarcEditor.deleteField(13);
        QuickMarcEditor.afterDeleteNotification(fieldData.fieldForDeleting.tag);
        QuickMarcEditor.undoDelete();
        QuickMarcEditor.verifyTagValue(13, fieldData.fieldForDeleting.tag);
        QuickMarcEditor.checkContent(fieldData.fieldForDeleting.content, 13);
        QuickMarcEditor.addValuesToExistingField(
          9,
          fieldData.field861.tag,
          fieldData.field861.content,
          fieldData.field861.ind1,
          fieldData.field861.ind2,
        );
        QuickMarcEditor.addValuesToExistingField(
          10,
          fieldData.field868.tag,
          fieldData.field868.content,
          fieldData.field868.ind1,
          fieldData.field868.ind2,
        );
        QuickMarcEditor.addValuesToExistingField(
          11,
          fieldData.field856.tag,
          fieldData.field856.content,
          fieldData.field856.ind1,
          fieldData.field856.ind2,
        );
        QuickMarcEditor.addValuesToExistingField(
          12,
          fieldData.emptyField.tag,
          fieldData.emptyField.content,
          fieldData.emptyField.ind1,
          fieldData.emptyField.ind2,
        );

        QuickMarcEditor.deleteField(10);
        QuickMarcEditor.afterDeleteNotification(fieldData.field861.tag);
        QuickMarcEditor.undoDelete();
        QuickMarcEditor.verifyTagValue(10, fieldData.field861.tag);
        QuickMarcEditor.deleteField(11);
        QuickMarcEditor.afterDeleteNotification(fieldData.field868.tag);
        QuickMarcEditor.undoDelete();
        QuickMarcEditor.verifyTagValue(11, fieldData.field868.tag);
        QuickMarcEditor.deleteField(12);
        QuickMarcEditor.afterDeleteNotification(fieldData.field856.tag);
        QuickMarcEditor.undoDelete();
        QuickMarcEditor.verifyTagValue(12, fieldData.field856.tag);
        QuickMarcEditor.deleteField(13);
        QuickMarcEditor.afterDeleteNotification(fieldData.emptyField.tag);
        QuickMarcEditor.undoDelete();
        QuickMarcEditor.verifyTagValue(13, fieldData.emptyField.tag);

        QuickMarcEditor.deleteField(7);
        QuickMarcEditor.afterDeleteNotification(fieldData.field035.tag);
        QuickMarcEditor.deleteField(10);
        QuickMarcEditor.afterDeleteNotification(fieldData.field861.tag);
        QuickMarcEditor.deleteField(13);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkDeletingFieldsModal();
        QuickMarcEditor.cancelDeletingField();
        QuickMarcEditor.verifyTagValue(7, fieldData.field035.tag);
        QuickMarcEditor.checkContent(fieldData.field035.content, 7);
        QuickMarcEditor.verifyTagValue(10, fieldData.field861.tag);
        QuickMarcEditor.checkContent(fieldData.field861.content, 10);
        QuickMarcEditor.verifyTagValue(13, fieldData.emptyField.tag);
        QuickMarcEditor.checkContent(fieldData.emptyField.content, 13);

        QuickMarcEditor.deleteField(9);
        QuickMarcEditor.afterDeleteNotification(fieldData.fieldForChecking.tag);
        QuickMarcEditor.deleteField(13);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.clickSaveAndCloseThenCheck('2');
        QuickMarcEditor.confirmDelete();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.checkHoldingsStatementAbsent(fieldData.field861.content);
        HoldingsRecordView.viewSource();
        InventoryViewSource.notContains(fieldData.fieldForChecking.tag);
      },
    );
  });
});
