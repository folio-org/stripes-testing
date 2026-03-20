import { including } from '@interactors/html';
import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomPrefix = getRandomLetters(2);
        const lccnNumberOfInstance1 = '58020559';
        const canceledLccnNumberOfInstance1 = '19951908';
        const lccnNumberOfInstance2 = `${randomPrefix}  58020560 `;
        const lccnNumberOfInstance3 = `${randomPrefix} 58020561`;
        const lccnNumberOfInstance4 = `${randomPrefix}58020562`;
        const InstanceTitle = `AT_C514849_SharedMarcBibInstance_${randomPostfix}`;
        const newSharedMarcInstanceTitle = `AT_C514849_NewSharedMarcBibInstance_${randomPostfix}`;
        const errorText = including('Fail: 010 $a already exists.');
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${InstanceTitle} 1`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfInstance1} $z ${canceledLccnNumberOfInstance1}`,
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${InstanceTitle} 2`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfInstance2}`,
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${InstanceTitle} 3`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfInstance3}`,
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${InstanceTitle} 4`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfInstance4}`,
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
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C514849');
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            ]).then((createdUser) => {
              user = createdUser;

              marcInstanceFields.forEach((fields) => {
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, fields).then(
                  (instanceId) => {
                    createdInstanceIds.push(instanceId);
                  },
                );
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
          InventoryInstances.deleteInstanceByTitleViaApi(InstanceTitle);
          InventoryInstances.deleteInstanceByTitleViaApi(newSharedMarcInstanceTitle);
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C514849 Create MARC bib record with "LCCN" which matches to other records "LCCN", "Canceled LCCN" when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514849'] },
          () => {
            // Step 1: Click on "Actions" - "+ New MARC bibliographic record" option
            InventoryInstance.newMarcBibRecord();

            // Steps 2-3: Fill in LDR and 008 fields
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 4: Fill in 245 field
            QuickMarcEditor.updateExistingField('245', `$a ${newSharedMarcInstanceTitle}`);

            // Step 5: Add "010 $a" which matches to "LCCN" without prefix of existing record and save
            QuickMarcEditor.addNewField('010', `$a ${lccnNumberOfInstance1}`, 4);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 6: Update "010 $a" with value which matches to "LCCN" with prefix and internal spaces and save
            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumberOfInstance2}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 7: Update "010 $a" with value which matches to "LCCN" with prefix and without spaces and save
            QuickMarcEditor.updateExistingField('010', `$a ${randomPrefix}58020560`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 8: Update "010 $a" with value which matches to "LCCN" with prefix and one internal space and save
            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumberOfInstance3}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 9: Update "010 $a" with value which matches to "LCCN" with prefix and without internal spaces and save
            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumberOfInstance4}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 10: Update "010 $a" with value which matches to "LCCN" with prefix and with internal spaces and save
            QuickMarcEditor.updateExistingField('010', `$a ${randomPrefix}  58020562`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 11: Update "010 $a" with value which matches to "Canceled LCCN" and save
            QuickMarcEditor.updateExistingField('010', `$a ${canceledLccnNumberOfInstance1}`, 4);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          },
        );
      });
    });
  });
});
