import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const lccnNumber = 'ha 00000955'; // 11 characters (2 letters + space + digits with leading zero)
        const marcInstanceTitle = `AT_C569554_MarcBibInstance_${randomPostfix}`;
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '010',
              content: '$a draft123',
              indicators: ['\\', '\\'],
            },
            {
              tag: '245',
              content: `$a ${marcInstanceTitle}`,
              indicators: ['1', '1'],
            },
          ],
        ];
        const tag010 = '010';
        const createdInstanceIds = [];
        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C569554');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          ])
            .then((createdUser) => {
              user = createdUser;

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields[0],
              ).then((instanceId) => {
                createdInstanceIds.push(instanceId);
              });

              InventoryInstances.toggleMarcBibLccnValidationRule({ enable: true });
            })
            .then(() => {
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
          createdInstanceIds.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C569554');
          InventoryInstances.toggleMarcBibLccnValidationRule({ enable: false });
        });

        it(
          'C569554 Derive a new MARC bib record with valid LCCN when "LCCN structure validation" is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C569554'] },
          () => {
            // Step 0: User is on the detail view pane of "MARC bibliographic" record
            InventoryInstances.searchByTitle(marcInstanceTitle);
            InventoryInstances.selectInstanceByTitle(marcInstanceTitle);
            InventoryInstance.waitLoading();

            // Step 1: Click on the "Actions" button >> "Derive new MARC bibliographic record"
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 2: Update "010" field "$a" with following valid value - 11 characters (2 letters + space + digits with leading zero)
            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumber}`);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();

            // Step 3: Click on the "Actions" button in the third pane >> Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkContentByTag(tag010, `$a ${lccnNumber} `);
          },
        );
      });
    });
  });
});
