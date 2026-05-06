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
        const sharedMarcInstanceTitle = `AT_C569535_SharedMarcBibInstance_${randomPostfix}`;
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
        const testCases = [
          {
            name: '10 characters (digits only)',
            value: '$a 2001050268',
            result: '$a   2001050268',
          },
          {
            name: '11 characters (1 letter + 10 digits)',
            value: '$a h2001050268',
            result: '$a h 2001050268',
          },
          {
            name: '11 characters (1 space + 10 digits)',
            value: '$a  2001050268',
            result: '$a   2001050268',
          },
          {
            name: '12 characters (1 space + 1 letter + 10 digits)',
            value: '$a  h2001050268',
            result: '$a h 2001050268',
          },
          {
            name: '12 characters (1 letter + 1 space + 10 digits)',
            value: '$a h 2001050269',
            result: '$a h 2001050269',
          },
          {
            name: '12 characters (2 spaces + 10 digits)',
            value: '$a   2001050268',
            result: '$a   2001050268',
          },
          {
            name: '12 characters (2 letters + 10 digits)',
            value: '$a ha2001050268',
            result: '$a ha2001050268',
          },
          { name: '8 characters (8 digits)', value: '$a 68004897', result: '$a    68004897 ' },
          {
            name: '9 characters (1 letter + 8 digits)',
            value: '$a a68004897',
            result: '$a a  68004897 ',
          },
          {
            name: '10 characters (2 letters + 8 digits)',
            value: '$a ac68004897',
            result: '$a ac 68004897 ',
          },
          {
            name: '11 characters (3 letters + 8 digits)',
            value: '$a afl68004897',
            result: '$a afl68004897 ',
          },
          {
            name: '12 characters (3 letters + 8 digits + space)',
            value: '$a afl68004898 ',
            result: '$a afl68004898 ',
          },
          {
            name: '9 characters (space + 8 digits)',
            value: '$a  68004897',
            result: '$a    68004897 ',
          },
          {
            name: '10 characters (2 spaces + 8 digits)',
            value: '$a   68004897',
            result: '$a    68004897 ',
          },
          {
            name: '11 characters (3 spaces + 8 digits)',
            value: '$a    68004897',
            result: '$a    68004897 ',
          },
          {
            name: '12 characters (3 spaces + 8 digits + space)',
            value: '$a    68004898 ',
            result: '$a    68004898 ',
          },
          {
            name: '10 characters (letter + space + 8 digits)',
            value: '$a a 68004897',
            result: '$a a  68004897 ',
          },
          {
            name: '10 characters (space + letter + 8 digits)',
            value: '$a  a68004897',
            result: '$a a  68004897 ',
          },
          {
            name: '11 characters (space + letter + space + 8 digits)',
            value: '$a  a 68004897',
            result: '$a a  68004897 ',
          },
        ];
        const createdInstanceIds = [];
        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C569535');

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
          'C569535 Spaces are added automatically in LCCN during saving on "Edit MARC record" pane when LCCN structure validation is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C569535'] },
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
              cy.log(`Checking valid LCCN: ${testCase.name}`);
              QuickMarcEditor.updateExistingField('010', testCase.value);
              QuickMarcEditor.clickSaveAndKeepEditing();
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkContentByTag('010', testCase.result);
            });
          },
        );
      });
    });
  });
});
