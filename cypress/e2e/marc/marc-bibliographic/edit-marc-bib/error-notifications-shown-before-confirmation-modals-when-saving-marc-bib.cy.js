import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

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
        errorMessage: 'Tag must contain three characters and can only accept numbers 0-9.',
        errorMarcTagWrongLength:
          'Record cannot be saved. A MARC tag must contain three characters.',
      };
      const marcFile = {
        marc: 'marcBibFileForC375176.mrc',
        fileName: `C375176 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      };

      before('Creating data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C375176');
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
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
        { tags: ['extendedPath', 'spitfire', 'C375176'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateExistingTagName(testData.tag040, testData.tag0);
          QuickMarcEditor.fillEmptyTextFieldOfField(0, 'records[0].content.ELvl', '');
          QuickMarcEditor.deleteTag(13);
          QuickMarcEditor.updateExistingField(testData.tag300, testData.tag300content);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(10, testData.errorMessage);
          QuickMarcEditor.fillEmptyTextFieldOfField(0, 'records[0].content.ELvl', '\\');
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(10, testData.errorMessage);
          QuickMarcEditor.updateExistingTagName(testData.tag0, testData.tag040);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyConfirmModal();
          QuickMarcEditor.clickRestoreDeletedField();
          QuickMarcEditor.checkDeleteModalClosed();
          QuickMarcEditor.checkButtonsEnabled();
        },
      );
    });
  });
});
