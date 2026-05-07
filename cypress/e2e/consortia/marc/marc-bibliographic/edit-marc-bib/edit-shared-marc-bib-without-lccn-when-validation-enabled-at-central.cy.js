import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const lccnNumberOfSharedInstance = `${getRandomLetters(2)} ${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const sharedMarcInstanceTitle = `AT_C514844_SharedMarcBibInstance_${randomPostfix}`;
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfSharedInstance}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: '245',
              content: `$a ${sharedMarcInstanceTitle}`,
              indicators: ['1', '1'],
            },
          ],
        ];
        const createdInstanceIds = [];
        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C514844');

          cy.toggleLccnDuplicateCheck({ enable: true });
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields[0],
          ).then((instanceId) => {
            createdInstanceIds.push(instanceId);
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ])
            .then((createdUser) => {
              user = createdUser;
            })
            .then(() => {
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
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C514844 Save existing "MARC bib" record without "010" field when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514844'] },
          () => {
            // Step 0: User is on the detail view pane of Shared "MARC bibliographic" record
            InventoryInstances.searchByTitle(sharedMarcInstanceTitle);
            InventoryInstances.selectInstanceByTitle(sharedMarcInstanceTitle);
            InventoryInstance.waitLoading();

            // Step 1: Click "Actions" button in the third pane → Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 2: Delete "010" field
            QuickMarcEditor.deleteFieldByTagAndCheck('010');

            // Step 3: Click on the "Save & keep editing" button >> Confirm deletion in appeared modal
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.confirmDeletingFields();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();
            QuickMarcEditor.checkFieldAbsense('010');
          },
        );
      });
    });
  });
});
