import { including } from '@interactors/html';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
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
        const testData = {
          bibFile: 'marcBibFileC514876.mrc',
          lccnValues: [
            '$a kk58020544514876 $z test',
            '$z test $a ek19951959514876',
            '$z kk58020544514876',
            '$a',
          ],
        };
        const randomPostfix = getRandomPostfix();
        const marcInstanceTitle = `AT_C514876_MarcBibInstance_${randomPostfix}`;
        const errorText = including('Fail: 010 $a already exists.');
        const marcInstanceFields = [
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
            content: `$a ${randomPostfix}`,
            indicators: ['\\', '\\'],
          },
        ];
        const createdInstanceIds = [];
        let user;

        after('Cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.toggleLccnDuplicateCheck({ enable: false });
          Users.deleteViaApi(user.userId);
          createdInstanceIds.forEach((instanceId) => {
            InventoryInstance.deleteInstanceViaApi(instanceId);
          });
        });

        it(
          'C514876 Cannot save existing MARC bib record with value in "010 $a" subfield which matches to Multiple records "LCCN", "Canceled LCCN" fields when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C514876'] },
          () => {
            // Precondition moved to `before` hook to make sure `after` hook will always be executed
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C514876');
              cy.createTempUser([
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]).then((createdUser) => {
                user = createdUser;

                // Import MARC bib file
                DataImport.uploadFileViaApi(
                  testData.bibFile,
                  `${testData.bibFile}.${randomPostfix}`,
                  'Default - Create instance and SRS MARC Bib',
                ).then((response) => {
                  response.forEach((record) => {
                    createdInstanceIds.push(record.instance.id);
                  });
                });

                // Create MARC bibliographic record to test editing
                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcInstanceFields,
                ).then((instanceId) => {
                  createdInstanceIds.push(instanceId);
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
              InventoryInstances.waitContentLoading();

              // Open MARC bib record in QuickMARC editor
              InventoryInstances.searchByTitle(marcInstanceTitle);
              InventoryInstances.selectInstanceByTitle(marcInstanceTitle);
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();
              QuickMarcEditor.updateLDR06And07Positions();

              // Attempt to update "010 $a" with various LCCN and Canceled LCCN values
              testData.lccnValues.forEach((lccnValue, index) => {
                QuickMarcEditor.updateExistingField('010', lccnValue);
                if (index < 2) {
                  QuickMarcEditor.pressSaveAndCloseButton();
                  QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
                } else {
                  QuickMarcEditor.clickSaveAndKeepEditingButton();
                  QuickMarcEditor.checkAfterSaveAndKeepEditing();
                }
              });
            });
          },
        );
      });
    });
  });
});
