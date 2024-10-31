import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
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
        tag245: '245',
        tag250: '250',
        rowNumber: 14,
        title: 'C375124 The Journal of ecclesiastical history.',
        content: '$a C375124',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileForC375124.mrc',
          fileName: `testMarcFileC375124.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      ];
      const instanceIds = [];

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                instanceIds.push(record[marcFile.propertyName].id);
              });
            });
          });
        });
      });

      beforeEach('Login with User', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        instanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C375124 User unable to delete "245" field for "MARC bibliographic" record when editing record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C375124'] },
        () => {
          InventoryInstances.searchByTitle(testData.title);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkFieldsExist([testData.tag245]);
          QuickMarcEditor.verifyEditableFieldIcons(testData.rowNumber, true, true, false);
          QuickMarcEditor.addNewField(testData.tag250, testData.content, testData.rowNumber);
          QuickMarcEditor.updateExistingTagName(testData.tag250, testData.tag245);
          QuickMarcEditor.verifyEditableFieldIcons(testData.rowNumber + 1, true, true, false);
        },
      );
    });
  });
});
