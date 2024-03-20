import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        createdRecordIDs: [],
        tag0: '0',
        tag040: '040',
        tag300: '300',
        tag300content: 'TEST',
        tagLDR: 'LDR',
        invalidLDR: '01338cas\\a2200409\\\\\\450',
        validLDR: '01338cas\\a2200409\\\\\\4500',
        errorMessage:
          'Record cannot be saved. The Leader must contain 24 characters, including null spaces.',
      };
      const marcFile = {
        marc: 'marcBibFileForC375176.mrc',
        fileName: `C375176 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
        propertyName: 'instance',
      };

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Deleting test user and an inventory instance', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        });
      });

      it(
        'C375176 Error notifications shown before confirmation modals when saving "MARC bib" record while editing record (Spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateExistingTagName(testData.tag040, testData.tag0);
          QuickMarcEditor.updateExistingField(testData.tagLDR, testData.invalidLDR);
          QuickMarcEditor.deleteTag(13);
          QuickMarcEditor.updateExistingField(testData.tag300, testData.tag300content);
          QuickMarcEditor.pressSaveAndKeepEditing(testData.errorMessage);
          QuickMarcEditor.updateExistingField(testData.tagLDR, testData.validLDR);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyAndDismissWrongTagLengthCallout();
          QuickMarcEditor.closeCallout();
          QuickMarcEditor.updateExistingTagName(testData.tag0, testData.tag040);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyConfirmModal();
          QuickMarcEditor.clickRestoreDeletedField();
          QuickMarcEditor.checkDeleteModalClosed();
          QuickMarcEditor.checkButtonsEnabled();
        },
      );
    });
  });
});
