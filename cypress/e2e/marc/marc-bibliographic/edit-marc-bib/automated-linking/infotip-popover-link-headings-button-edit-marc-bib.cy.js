import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          instanceTitle: `AT_C1045434_MarcBibInstance_${randomPostfix}`,
        };
        const marcInstanceFields = [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: '245',
            content: `$a ${testData.instanceTitle}`,
            indicators: ['1', '1'],
          },
        ];

        let userData;
        let testInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('C1045434_');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ])
            .then((userProperties) => {
              userData = userProperties;

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields,
              ).then((instanceId) => {
                testInstanceId = instanceId;
              });
            })
            .then(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
        });

        it(
          'C1045434 Verify that the infotip popover is displayed next to the "Link headings" button on the Edit MARC bib record pane. (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C1045434'] },
          () => {
            // Step 1: Open Edit MARC bib record pane
            InventoryInstances.searchByTitle(testInstanceId);
            InventoryInstances.selectInstanceById(testInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
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
