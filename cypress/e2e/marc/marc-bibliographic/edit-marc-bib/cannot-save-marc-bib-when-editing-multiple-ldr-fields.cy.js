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
        tagLDR: 'LDR',
        errorMessage: 'Record not saved: Communication problem with server. Please try again.',
        marcFile: {
          marc: 'oneMarcBib.mrc',
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
        'C496200 Cannot save "MARC bibliographic" record with multiple "LDR" fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C496200'] },
        () => {
          InventoryInstances.searchByTitle(instanceId[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.addNewField(testData.tagLDR, testData.LDRValue, 4);
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.errorMessage);
        },
      );
    });
  });
});
