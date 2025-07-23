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
          bibFile: 'marcBibFileC589506.mrc',
          lccnValues: ['vp58020562589506', 'pv19951911589506'],
        };
        const randomPostfix = getRandomPostfix();
        const marcInstanceTitle = `AT_C589506_MarcBibInstance_${randomPostfix}`;
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
          'C589506 Cannot save existing MARC bib record with value in "010 $a" subfield which matches to "Suppressed from discovery" record "LCCN", "Canceled LCCN" fields when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C589506'] },
          () => {
            // Precondition moved to `before` hook to make sure `after` hook will always be executed
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C589506');
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
                    cy.getInstanceById(record.instance.id).then((instanceData) => {
                      instanceData.discoverySuppress = true;
                      cy.updateInstance(instanceData);
                    });
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
                cy.reload();
              }, 20_000);
              InventoryInstances.waitContentLoading();

              // Open MARC bib record in QuickMARC editor
              InventoryInstances.searchByTitle(marcInstanceTitle);
              InventoryInstances.selectInstanceByTitle(marcInstanceTitle);
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();
              QuickMarcEditor.updateLDR06And07Positions();

              // Step 2: Attempt to update "010 $a" with LCCN of suppressed from discovery record
              QuickMarcEditor.updateExistingField('010', `$a ${testData.lccnValues[0]}`);
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);

              // Step 3: Attempt to update "010 $a" with Canceled LCCN of suppressed from discovery record
              QuickMarcEditor.updateExistingField('010', `$a ${testData.lccnValues[1]}`);
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            });
          },
        );
      });
    });
  });
});
