import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        rowIndex: 6,
        newTagValue: '40',
        errorMessage: 'Tag must contain three characters and can only accept numbers 0-9.',
        marcFile: {
          marc: 'marcBibFileForC499627.mrc',
          fileName: `testMarcFileC499627.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };
      let user;
      const instanceId = [];

      before('Create user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              instanceId.push(record[testData.marcFile.propertyName].id);
            });
          });
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete user and instance', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C10936 Check for field character length when saving in quickMARC (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C10936'] },
        () => {
          InventoryInstances.searchByTitle(instanceId[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();

          QuickMarcEditor.updateExistingTagValue(testData.rowIndex, testData.newTagValue);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(testData.rowIndex, testData.errorMessage);
        },
      );
    });
  });
});
