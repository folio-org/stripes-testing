import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tag245: '245',
        marcTitle: 'C523588 Create MARC bib with standard field without errors',
        successMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
      };

      let user;
      let instanceId;
      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        if (instanceId) InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      it(
        'C523588 "MARC validation rules check" modal appears during create of MARC bib record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C523588'] },
        () => {
          InventoryInstance.newMarcBibRecord();

          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.marcTitle}`);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 1);
          cy.wait(1000);

          QuickMarcEditor.simulateSlowNetwork('**/records-editor/validate', 5000);

          QuickMarcEditor.pressSaveAndCloseButton();

          QuickMarcEditor.verifySlowInternetConnectionModal();

          cy.wait('@slowNetworkRequest');

          QuickMarcEditor.checkCallout(testData.successMessage);
          cy.wait(2000);
          InventoryInstance.waitInventoryLoading();
        },
      );
    });
  });
});
