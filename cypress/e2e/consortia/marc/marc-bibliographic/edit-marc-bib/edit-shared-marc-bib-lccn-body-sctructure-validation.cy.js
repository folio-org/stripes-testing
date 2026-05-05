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
    describe('Edit MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const sharedMarcInstanceTitle = `AT_C569551_SharedMarcBibInstance_${randomPostfix}`;
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '010',
              content: '$a dr12345678',
              indicators: ['\\', '\\'],
            },
            {
              tag: '245',
              content: `$a ${sharedMarcInstanceTitle}`,
              indicators: ['1', '1'],
            },
          ],
        ];
        const errorText = including('Fail: 010 $a is in an invalid format.');
        const testCases = [
          {
            name: 'special character in LCCN body (beginning)',
            value: 'rc_001050270',
          },
          {
            name: 'space in LCCN body (beginning)',
            value: 'rc 001050270',
          },
          {
            name: 'letter in LCCN body of 1st format (beginning)',
            value: 'hex001050270',
          },
          {
            name: 'special character in LCCN body of 1st format (middle)',
            value: 'rc2001%50270',
          },
          {
            name: 'space in LCCN body of 1st format (middle)',
            value: 'rc20010 0270',
          },
          {
            name: 'letter in LCCN body of 1st format (middle)',
            value: 'rc200d050270',
          },
          {
            name: 'special character in LCCN body of 1st format (end)',
            value: 'rc200105027.',
          },
          {
            name: 'space in LCCN body of 1st format (end)',
            value: 'rc200105027 ',
          },
          {
            name: 'letter in LCCN body',
            value: 'rc200105027s of 1st format (end)',
          },
          {
            name: 'special character in LCCN body of 2nd format (beginning)',
            value: 'phq#8004897',
          },
          {
            name: 'space in LCCN body of 2nd format (beginning)',
            value: 'phq 8004897',
          },
          {
            name: 'letter in LCCN body of 2nd format (beginning)',
            value: 'phqa8004897',
          },
          {
            name: 'special character in LCCN body of 2nd format (middle)',
            value: 'hq680--897',
          },
          {
            name: 'space in LCCN body of 2nd format (middle)',
            value: 'phq680 48 7',
          },
          {
            name: 'letter in LCCN body of 2nd format (middle)',
            value: 'phq68a0b897',
          },
          {
            name: 'special character in LCCN body of 2nd format (end)',
            value: 'phq6800489?',
          },
          {
            name: 'space in LCCN body of 2nd format (end)',
            value: 'phq6800489 ',
          },
          {
            name: 'letter in LCCN body of 2nd format (end)',
            value: 'phq6800489',
          },
        ];
        const createdInstanceIds = [];
        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C569551');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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
          'C569551 Special characters, spaces, letters existing validation in LCCN body on "Edit MARC record" pane when LCCN structure validation is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C569551'] },
          () => {
            // Step 0: User is on the detail view pane of Shared "MARC bibliographic" record
            InventoryInstances.searchByTitle(sharedMarcInstanceTitle);
            InventoryInstances.selectInstanceByTitle(sharedMarcInstanceTitle);
            InventoryInstance.waitLoading();

            // Step 1: Click "Actions" button in the third pane → Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            // Steps 2-20: Update "010 $a" value with some LCCN and check formatted value after saving
            testCases.forEach((testCase) => {
              cy.log(`Checking invalid LCCN: ${testCase.name}`);
              QuickMarcEditor.updateExistingField('010', `$a ${testCase.value}`);
              QuickMarcEditor.checkContentByTag('010', `$a ${testCase.value}`);
              QuickMarcEditor.clickSaveAndKeepEditingButton();
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
