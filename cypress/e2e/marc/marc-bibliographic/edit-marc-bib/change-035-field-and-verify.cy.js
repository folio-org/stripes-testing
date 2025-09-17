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
        initialSystemControl: '(OCoLC)962073864',
        updatedOCLCNumber: '(OCoLC)12345',
        title: `C10996 Test Instance ${getRandomPostfix()}`,
        marcFile: {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFileC10989.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };
      let user;
      const instanceId = [];

      before('Create user', () => {
        cy.getAdminToken();
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
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete user and instance', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C10996 Change the 035 subfield in quickMARC and verify change in the instance record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C10996'] },
        () => {
          InventoryInstances.searchByTitle(instanceId[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.verifyResourceIdentifier('OCLC', testData.initialSystemControl, 4);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateExistingFieldContent(9, `$a ${testData.updatedOCLCNumber}`);
          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.waitInventoryLoading();

          InventoryInstance.verifyResourceIdentifier('OCLC', testData.updatedOCLCNumber, 4);
        },
      );
    });
  });
});
