import { including } from '@interactors/html';
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
        const instanceTitle = `AT_C569533_SharedMarcBibInstance_${randomPostfix}`;
        const errorText = including('Fail: 010 $a is in an invalid format.');
        const invalidLccnValues = [
          'cf20010459444', // 13 characters (letters + digits)
          'c', // 1 character (letter)
          '200104594441', // 12 characters (digits only)
          'c20010459444', // 12 characters (letter + 11 digits)
          '20010459444', // 11 characters (digits only)
          'c200104594', // 10 characters (letter + 9 digits)
          '200104594', // 9 characters (digits only)
          'c2001045', // 8 characters (letter + 7 digits)
          '2001045', // 7 characters (digits only)
          'c2', // 2 characters (letter + 1 digit)
          '2', // 1 character (digit)
        ];
        let user;

        before('Create test data', () => {
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C569533');
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            ]).then((createdUser) => {
              user = createdUser;
              InventoryInstances.toggleMarcBibLccnValidationRule({ enable: true });
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
          InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
          InventoryInstances.toggleMarcBibLccnValidationRule({ enable: false });
        });

        it(
          'C569533 LCCN length validation on "Create a new MARC bib record" pane when LCCN structure validation is enabled (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C569533'] },
          () => {
            // Step 1: Click on "Actions" - "+ New MARC bibliographic record" option
            InventoryInstance.newMarcBibRecord();

            // Steps 2-3: Fill in LDR and 008 fields
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 4: Fill in 245 field
            QuickMarcEditor.updateExistingField('245', `$a ${instanceTitle}`);

            // Step 5-15: Add "010" field and fill "$a" with invalid LCCN values
            QuickMarcEditor.addNewField('010', '', 4);
            invalidLccnValues.forEach((lccn) => {
              QuickMarcEditor.updateExistingField('010', `$a ${lccn}`);
              QuickMarcEditor.checkContentByTag('010', `$a ${lccn}`);
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout();
              QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
              QuickMarcEditor.closeAllCallouts();
            });
          },
        );
      });
    });
  });
});
