import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Automated linking', () => {
        let userData;

        before('Create test data', () => {
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((userProperties) => {
            userData = userProperties;

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C422143 Verify that the infotip popover is displayed next to the "Link headings" button on the New MARC bib record pane. (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C422143'] },
          () => {
            // Step 1: Open new MARC bib record pane
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.verifyLinkHeadingsInfoButtonExists();

            // Step 2: Click the infotip icon and verify popover content
            QuickMarcEditor.clickLinkHeadingsInfoButton();
            QuickMarcEditor.verifyLinkHeadingsPopoverContent();

            // Step 3: Verify "Learn more" button has correct href
            QuickMarcEditor.verifyLinkHeadingsPopoverLearnMoreHref();
          },
        );
      });
    });
  });
});
