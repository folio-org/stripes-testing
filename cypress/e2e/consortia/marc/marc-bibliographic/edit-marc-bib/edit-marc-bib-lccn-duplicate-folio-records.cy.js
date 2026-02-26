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
        const testData = {
          lccnValues: ['vpi794563523570'],
          canceledLccnValues: ['vpi766384523570'],
        };
        const randomPostfix = getRandomPostfix();
        const marcInstanceTitle = `AT_C523570_MarcBibInstance_${randomPostfix}`;
        const folioInstanceTitle = `AT_C523570_FolioInstance_${randomPostfix}`;
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
          'C523570 Save existing MARC bib record with value in "010 $a" subfield which matches to other FOLIO records "LCCN", "Canceled LCCN" fields when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C523570'] },
          () => {
            // Precondition moved to `before` hook to make sure `after` hook will always be executed
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C523570');
              cy.createTempUser([
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]).then((createdUser) => {
                user = createdUser;

                cy.then(() => {
                  // Fetch instance and identifier types for FOLIO record creation
                  cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                    (instanceTypes) => {
                      testData.instanceTypeId = instanceTypes[0].id;
                    },
                  );
                  InventoryInstances.getIdentifierTypes({ query: 'name=="LCCN"' }).then(
                    (identifier) => {
                      testData.lccnTypeId = identifier.id;
                    },
                  );
                  InventoryInstances.getIdentifierTypes({ query: 'name=="Canceled LCCN"' }).then(
                    (identifier) => {
                      testData.canceledLccnTypeId = identifier.id;
                    },
                  );
                  // Create FOLIO instances with LCCN and Canceled LCCN values
                }).then(() => {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: testData.instanceTypeId,
                      title: folioInstanceTitle,
                      identifiers: [
                        {
                          identifierTypeId: testData.lccnTypeId,
                          value: testData.lccnValues[0],
                        },
                        {
                          identifierTypeId: testData.canceledLccnTypeId,
                          value: testData.canceledLccnValues[0],
                        },
                      ],
                    },
                  }).then((folioInstanceId) => {
                    createdInstanceIds.push(folioInstanceId.instanceId);
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

              // Attempt to update "010 $a" with LCCN values
              testData.lccnValues.forEach((lccnValue) => {
                QuickMarcEditor.updateExistingField('010', `$a ${lccnValue}`);
                QuickMarcEditor.pressSaveAndCloseButton();
                QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
              });

              // Attempt to update "010 $a" with Canceled LCCN values
              testData.canceledLccnValues.forEach((canceledLccnValue) => {
                QuickMarcEditor.updateExistingField('010', `$a ${canceledLccnValue}`);
                QuickMarcEditor.clickSaveAndKeepEditing();
              });
            });
          },
        );
      });
    });
  });
});
