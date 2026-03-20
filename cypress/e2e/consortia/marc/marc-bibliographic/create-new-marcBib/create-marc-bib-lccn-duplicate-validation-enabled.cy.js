import { including } from '@interactors/html';
import Affiliations from '../../../../../support/dictionary/affiliations';
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
        const lccnNumberOfSharedInstance = `${getRandomLetters(2)} ${randomDigits}${randomDigits}`;
        const canceledLccnNumberOfSharedInstance = `${getRandomLetters(2)} ${randomDigits}${randomDigits}`;
        const lccnNumberOfLocalInstance = `${getRandomLetters(2)} ${randomDigits}${randomDigits}`;
        const sharedMarcInstanceTitle = `AT_C514877_SharedMarcBibInstance_${randomPostfix}`;
        const localMarcInstanceTitle = `AT_C514877_LocalMarcBibInstance_${randomPostfix}`;
        const newSharedMarcInstanceTitle = `AT_C514877_NewSharedMarcBibInstance_${randomPostfix}`;
        const errorText = including('Fail: 010 $a already exists.');
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
              content: `$a ${lccnNumberOfSharedInstance} $z ${canceledLccnNumberOfSharedInstance}`,
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
              content: `$a ${localMarcInstanceTitle} 2`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfLocalInstance}`,
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
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C514877');
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
              });

              cy.setTenant(Affiliations.College);
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields[1],
              ).then((instanceId) => {
                createdInstanceIds.push(instanceId);
              });

              cy.resetTenant();
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
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteInstanceByTitleViaApi(localMarcInstanceTitle);
        });

        it(
          'C514877 Duplicate LCCN ("010 $a") prevents Shared MARC bib record creation when check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514877'] },
          () => {
            // Step 1: Click on "Actions" - "+ New MARC bibliographic record" option
            InventoryInstance.newMarcBibRecord();

            // Steps 2-3: Fill in LDR and 008 fields
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 4: Fill in 245 field
            QuickMarcEditor.updateExistingField('245', `$a ${newSharedMarcInstanceTitle}`);

            // Step 5: Add "010 $a" which matches to "LCCN" of existing Shared record and save
            QuickMarcEditor.addNewField('010', `$a ${lccnNumberOfSharedInstance}`, 4);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 6: Update "010 $a" value with which matches to "Canceled LCCN" of existing Shared record and save
            QuickMarcEditor.updateExistingField('010', `$a ${canceledLccnNumberOfSharedInstance}`);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            // Step 7: Repeat steps 1-4
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();
            QuickMarcEditor.updateExistingField('245', `$a ${newSharedMarcInstanceTitle} 2nd`);

            // Step 8: Add "010 $a" which matches to "LCCN" of existing Local record and save
            QuickMarcEditor.addNewField('010', `$a ${lccnNumberOfLocalInstance}`, 4);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          },
        );
      });
    });
  });
});
