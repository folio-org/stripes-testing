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
    describe('Derive MARC bib', () => {
      const testData = {
        tag245: '245',
        updatedContent: 'C523591 test',
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
      const fileName = `testMarcFileForC523591.${getRandomPostfix()}.mrc`;
      const propertyName = 'instance';

      let user;
      let instanceId;

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;

          DataImport.uploadFileViaApi('marcBibFileForC523591.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                instanceId = record[propertyName].id;
              });
            },
          );

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      it(
        'C523591 "MARC validation rules check" modal appears during derive of MARC bib record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C523591'] },
        () => {
          InventoryInstances.searchByTitle(instanceId);
          InventoryInstances.selectInstanceById(instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkDerivePaneheader();
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.updatedContent}`);
          cy.wait(1000);
          QuickMarcEditor.simulateSlowNetwork('**/records-editor/validate', 5000);

          QuickMarcEditor.pressSaveAndCloseButton();

          QuickMarcEditor.verifySlowInternetConnectionModal();

          cy.wait('@slowNetworkRequest');
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndClose();

          QuickMarcEditor.checkCallout(testData.successMessage);
          cy.wait(2000);
          InventoryInstance.waitInventoryLoading();
        },
      );
    });
  });
});
