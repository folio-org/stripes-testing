import { Permissions } from '../../../../support/dictionary';
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
        instanceTitle: `AT_C503056_MarcBibInstance_${getRandomPostfix()}`,
        tag245: '245',
        tag245Value1: '$a',
        tag245Value2: '',
      };
      const createdRecordIDs = [];
      let user;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            createdRecordIDs.push(instanceId);
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
          });
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        createdRecordIDs.forEach((recordId) => {
          InventoryInstance.deleteInstanceViaApi(recordId);
        });
      });

      it(
        'C503056 Cannot derive "MARC bib" record without a value in "245" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C503056'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkDerivePaneheader();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245Value1);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyNo245TagCallout();
          QuickMarcEditor.verifyValidationCallout(0, 1);
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245Value2);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyNo245TagCallout();
          QuickMarcEditor.verifyValidationCallout(0, 1);
        },
      );
    });
  });
});
