import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = randomFourDigitNumber();
        const lccnNumber = `${getRandomLetters(2)}${randomDigits}${randomDigits}`;
        const marcInstanceTitle = `AT_C523559_MarcBibInstance_${randomPostfix}`;
        const marcInstanceTitleUpdated = `AT_C523559_MarcBibInstance_${randomPostfix}_Updated`;
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '010',
              content: `$a ${lccnNumber}`,
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
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C523559');

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

              cy.toggleLccnDuplicateCheck({ enable: true });
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
          InventoryInstance.deleteInstanceViaApi(createdInstanceIds[0]);
          InventoryInstances.deleteInstanceByTitleViaApi(marcInstanceTitleUpdated);
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C523559 Derive existing "MARC bib" record without "010" field when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C523559'] },
          () => {
            // Step 0: User is on the detail view pane of "MARC bibliographic" record
            InventoryInstances.searchByTitle(marcInstanceTitle);
            InventoryInstances.selectInstanceByTitle(marcInstanceTitle);
            InventoryInstance.waitLoading();

            // Step 1: Click on the "Actions" button >> "Derive new MARC bibliographic record"
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 2: Update any field
            QuickMarcEditor.updateExistingField('245', `$a ${marcInstanceTitleUpdated}`);

            // Step 3: Click on "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();

            // Step 4: Click on the "Actions" >> "View source"
            InventoryInstance.viewSource();
            InventoryViewSource.verifyAbsenceOfValueInRow(`${tag010}`, 4);
          },
        );
      });
    });
  });
});
