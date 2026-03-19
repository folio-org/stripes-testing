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
        const instanceTitle = `AT_C569546_SharedMarcBibInstance_${randomPostfix}`;
        const errorText = including('Fail: 010 $a is in an invalid format.');
        const invalidLccnValues = [
          'rc-68004898', // special character in prefix
          'rc168004898', // digit in prefix
          '\\rc68004897', // special character in prefix
          '8rc68004897', // digit in prefix
          'p_q68004897', // special character in prefix
          'p3q68004897', // digit in prefix
          'r-2001050270', // special character in prefix
          'r12001050270', // digit in prefix
          '=c2001050270', // special character in prefix
          '0c2001050270', // digit in prefix
          'a l68004897', // letter + space + letter + 8 digits
        ];
        let user;

        before('Create test data', () => {
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C569546');
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
          InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
          InventoryInstances.toggleMarcBibLccnValidationRule({ enable: false });
        });

        it(
          'C569546 Digit, special characters, spaces validation in LCCN prefix on "Create a new MARC bib record" pane when LCCN structure validation is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C569546'] },
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
