import { RECORD_STATUSES, JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
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
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import FileManager from '../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      jobProfileToRun: 'Default - Create Holdings and SRS MARC Holdings',
      fileWithHoldingsPathForUpload: 'marcBibFileForC375187.mrc',
      editedMarcFileName: `C375187 testMarcFile${getRandomPostfix()}.mrc`,
      tagLDR: {
        tag: 'LDR',
        invalidValue: '00506cy\\\\a22001574\\\\450',
        validValue: '00506cy\\\\a22001574\\\\4500',
      },
      tag014: {
        tag: '014',
        updatedTag: '0',
        rowIndex: 6,
      },
      tag035: {
        tag: '035',
        newContent: '$a 445553 TEST',
        rowIndex: 7,
      },
      tag866: {
        tag: '866',
        content: '$8 0 $a v.54-68 (2003-2017)',
        rowIndex: 9,
      },
      errors: {
        ldrCharacterLength:
          'Record cannot be saved. The Leader must contain 24 characters, including null spaces.',
        tagCharacterLength: 'Record cannot be saved. A MARC tag must contain three characters.',
      },
    };
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `C375187 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      propertyName: 'relatedInstanceInfo',
    };

    before('create test data and login', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
        (response) => {
          response.entries.forEach((record) => {
            testData.instanceID = record[marcFile.propertyName].idList[0];
          });
        },
      );
      Logs.waitFileIsImported(marcFile.fileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(marcFile.fileName);
      FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        // edit marc file adding instance hrid
        DataImport.editMarcFile(
          testData.fileWithHoldingsPathForUpload,
          testData.editedMarcFileName,
          ['HRID'],
          [initialInstanceHrId],
        );
      });
      // upload a marc file for creating holdings
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(testData.editedMarcFileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(testData.jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(testData.editedMarcFileName);
      Logs.openFileDetails(testData.editedMarcFileName);
      cy.logout();

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHrid}"`,
        }).then((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${testData.editedMarcFileName}`);
    });

    it(
      'C375187 Error notifications shown before modals when saving "MARC holdings" record while editing record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceID);
        InventoryInstances.selectInstance();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHrid = initialInstanceHrId;
        });
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.deleteField(9);
        QuickMarcEditor.afterDeleteNotification(testData.tag866.tag);
        QuickMarcEditor.checkButtonsEnabled();
        QuickMarcEditor.updateExistingField(testData.tagLDR.tag, testData.tagLDR.invalidValue);
        QuickMarcEditor.checkLDRValue(testData.tagLDR.invalidValue);
        QuickMarcEditor.updateExistingField(testData.tag035.tag, testData.tag035.newContent);
        QuickMarcEditor.checkContent(testData.tag035.newContent, testData.tag035.rowIndex);
        QuickMarcEditor.updateExistingTagValue(
          testData.tag014.rowIndex,
          testData.tag014.updatedTag,
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkCallout(testData.errors.ldrCharacterLength);
        QuickMarcEditor.updateExistingField(testData.tagLDR.tag, testData.tagLDR.validValue);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkCallout(testData.errors.tagCharacterLength);
        QuickMarcEditor.updateExistingTagValue(testData.tag014.rowIndex, testData.tag014.tag);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.clickSaveAndCloseThenCheck(1);
        QuickMarcEditor.clickRestoreDeletedField();
        QuickMarcEditor.checkDeleteModalClosed();
        QuickMarcEditor.checkContent(testData.tag866.content, testData.tag866.rowIndex);
        QuickMarcEditor.checkButtonsEnabled();
      },
    );
  });
});
