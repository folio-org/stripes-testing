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
    describe('Derive MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const marcInstanceTitle = `AT_C569540_MarcBibInstance_${randomPostfix}`;
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${marcInstanceTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a 123',
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const errorText = including('Fail: 010 $a is in an invalid format.');
        const invalidLccnValues = [
          'HEX79139101', // 11 characters (whole prefix in upper case + digits)
          'Hex79139101', // 11 characters (first letter in prefix in upper case + digits)
          'hEx79139101', // 11 characters (second letter in prefix in upper case + digits)
          'heX79139101', // 11 characters (third letter in prefix in upper case + digits)
          'H  79139101', // 11 characters (prefix in upper case + 2 spaces + digits)
          'PA2001045944', // 12 characters (whole prefix in upper case + digits)
          'Pa2001045944', // 12 characters (first letter of prefix in upper case + digits)
          'pA2001045944', // 12 characters (second letter of prefix in upper case + digits)
          'P 2001045944', // 12 characters (prefix in upper case + space + digits)
        ];
        const createdInstanceIds = [];
        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C569540');

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
          InventoryInstances.toggleMarcBibLccnValidationRule({ enable: false });
        });

        it(
          'C569540 LCCN prefix case validation on "Derive a new MARC bib record" pane when "LCCN structure validation" rule is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C569540'] },
          () => {
            // Step 0: User is on the detail view pane of "MARC bibliographic" record
            InventoryInstances.searchByTitle(marcInstanceTitle);
            InventoryInstances.selectInstanceByTitle(marcInstanceTitle);
            InventoryInstance.waitLoading();

            // Step 1: Click on the "Actions" button >> "Derive new MARC bibliographic record"
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            // Steps 2-10: Verify validation on invalid LCCN values
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
