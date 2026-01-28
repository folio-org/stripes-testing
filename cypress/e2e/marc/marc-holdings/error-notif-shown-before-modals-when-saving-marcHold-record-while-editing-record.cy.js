import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      fileWithHoldingsPathForUpload: 'marcBibFileForC375187.mrc',
      editedMarcFileName: `C375187 testMarcFile${getRandomPostfix()}.mrc`,
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
        tagCharacterLength: 'A MARC tag must contain three characters.',
      },
    };
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `C375187 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    before('create test data and login', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
        (response) => {
          response.forEach((record) => {
            testData.instanceID = record[marcFile.propertyName].id;
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
      DataImport.uploadFileViaApi(
        testData.editedMarcFileName,
        testData.editedMarcFileName,
        testData.jobProfileToRun,
      );
      Logs.waitFileIsImported(testData.editedMarcFileName);
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
      { tags: ['extendedPath', 'spitfire', 'C375187'] },
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
        QuickMarcEditor.updateExistingField(testData.tag035.tag, testData.tag035.newContent);
        QuickMarcEditor.checkContent(testData.tag035.newContent, testData.tag035.rowIndex);
        QuickMarcEditor.updateExistingTagValue(
          testData.tag014.rowIndex,
          testData.tag014.updatedTag,
        );
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          'Item',
          MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN.I,
        );
        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkErrorMessage(6, testData.errors.tagCharacterLength);
        QuickMarcEditor.verifyValidationCallout(0, 1);
        QuickMarcEditor.updateExistingTagValue(testData.tag014.rowIndex, testData.tag014.tag);
        QuickMarcEditor.clickSaveAndCloseThenCheck(1);
        QuickMarcEditor.clickRestoreDeletedField();
        QuickMarcEditor.checkDeleteModalClosed();
        QuickMarcEditor.checkContent(testData.tag866.content, testData.tag866.rowIndex);
        QuickMarcEditor.checkButtonsEnabled();
      },
    );
  });
});
