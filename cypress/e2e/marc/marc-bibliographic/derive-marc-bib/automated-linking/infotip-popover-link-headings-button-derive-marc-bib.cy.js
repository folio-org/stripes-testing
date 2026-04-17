import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          instanceTitle: `AT_C1045435_MarcBibInstance_${randomPostfix}`,
        };
        const marcInstanceFields = [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: '245',
            content: `$a ${testData.instanceTitle}`,
            indicators: ['1', '0'],
          },
        ];
        const userCapabilitySets = [
          CapabilitySets.uiInventory,
          CapabilitySets.uiQuickMarcQuickMarcEditor,
          CapabilitySets.uiQuickMarcEditorDuplicate,
          CapabilitySets.uiQuickMarcQuickMarcAuthorityRecordsLinkUnlink,
          CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        ];

        let testInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C1045435');

          cy.createTempUser([])
            .then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;
              cy.assignCapabilitiesToExistingUser(
                testData.userProperties.userId,
                [],
                userCapabilitySets,
              );
            })
            .then(() => {
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields,
              ).then((instanceId) => {
                testInstanceId = instanceId;
              });
            })
            .then(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
        });

        it(
          'C1045435 Verify that the infotip popover is displayed next to the "Link headings" button on the Derive a new MARC bib record pane. (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C1045435'] },
          () => {
            // Step 1: Open Derive a new MARC bib record pane
            InventoryInstances.searchByTitle(testInstanceId);
            InventoryInstances.selectInstanceById(testInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.deriveNewMarcBibRecord();
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
