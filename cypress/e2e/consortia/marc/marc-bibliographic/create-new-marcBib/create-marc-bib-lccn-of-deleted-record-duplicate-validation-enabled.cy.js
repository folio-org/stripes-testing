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
    describe('Create MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = randomFourDigitNumber();
        const lccnNumberOfSharedInstance = `${getRandomLetters(2)}${randomDigits}${randomDigits}`;
        const sharedMarcInstanceTitle = `AT_C569611_SharedMarcBibInstance_${randomPostfix}`;
        const newSharedMarcInstanceTitle = `AT_C569611_NewSharedMarcBibInstance_${randomPostfix}`;
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${sharedMarcInstanceTitle} 1`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfSharedInstance}`,
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const createdInstanceIds = [];
        let user;

        before('Create test data', () => {
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C569611');
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            ]).then((createdUser) => {
              user = createdUser;

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields[0],
              ).then((instanceId) => {
                createdInstanceIds.push(instanceId);
                cy.getInstanceById(instanceId).then((instanceData) => {
                  instanceData.staffSuppress = true;
                  instanceData.discoverySuppress = true;
                  instanceData.deleted = true;
                  cy.updateInstance(instanceData);
                });
              });
              cy.toggleLccnDuplicateCheck({ enable: true });
            });
          }).then(() => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after('Cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceByTitleViaApi(sharedMarcInstanceTitle);
          InventoryInstances.deleteInstanceByTitleViaApi(newSharedMarcInstanceTitle);
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C569611 Verify that a MARC bib record can be created with a LCCN matching a marked as deleted record when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C569611'] },
          () => {
            // Step 1: Click on "Actions" - "+ New MARC bibliographic record" option
            InventoryInstance.newMarcBibRecord();

            // Steps 2-3: Fill in LDR and 008 fields
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 4: Fill in 245 field
            QuickMarcEditor.updateExistingField('245', `$a ${newSharedMarcInstanceTitle}`);

            // Step 5: Add "010 $a" which matches to "LCCN" of existing record, which is marked for deletion and save
            QuickMarcEditor.addNewField('010', `$a ${lccnNumberOfSharedInstance}`, 4);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          },
        );
      });
    });
  });
});
