import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        field245: { tag: '245', content: 'C434154 The most important book' },
      };

      before(() => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C434154 "Are you sure?" modal is displayed after user pressed "ESC" button when record has unsaved changes - Create a new MARC bib record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C434154'] },
        () => {
          // #1 Click on "Actions" button in second pane → Select "New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          // #2 Update any field
          QuickMarcEditor.updateExistingField(testData.field245.tag, testData.field245.content);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();

          // #3 Press on the "ESC" keyboard button
          QuickMarcEditor.discardChangesWithEscapeKey(4);

          // Verify "Are you sure?" modal appears
          QuickMarcEditor.cancelEditConfirmationPresented();
        },
      );
    });
  });
});
