import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const newSharedMarcInstanceTitle = `AT_C523560_NewSharedMarcBibInstance_${randomPostfix}`;
        let user;

        before('Create test data', () => {
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C523560');
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            ]).then((createdUser) => {
              user = createdUser;
              cy.toggleLccnDuplicateCheck({ enable: true });
            });
          }).then(() => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceByTitleViaApi(newSharedMarcInstanceTitle);
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C523560 Create "MARC bib" record without "010" field when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C523560'] },
          () => {
            // Step 1: Click on "Actions" - "+ New MARC bibliographic record" option
            InventoryInstance.newMarcBibRecord();

            // Steps 2-3: Fill in LDR and 008 fields
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 4: Fill in 245 field
            QuickMarcEditor.updateExistingField('245', `$a ${newSharedMarcInstanceTitle}`);

            // Step 5: Save the record
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          },
        );
      });
    });
  });
});
