import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
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
          bibFile: 'marcBibFileC569613.mrc',
          lccnValues: [
            'vp58020562569613',
            'pv19951911569613',
            'lccn12345678569613',
            'vpi79456384569613',
            'vpi76638463569613',
          ],
        };
        const randomPostfix = getRandomPostfix();
        const folioInstancePrefix = `AT_C569613_FolioInstance_${randomPostfix}`;
        const marcInstanceTitle = `AT_C569613_MarcBibInstance_${randomPostfix}`;
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
          'C569613 Edit MARC bib record with "010 $a" subfield matched to others, marked as deleted records (MARC and FOLIO) with "LCCN", "Canceled LCCN" fields when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C569613'] },
          () => {
            // Precondition moved to `it` block to make sure `after` hook will always be executed
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C569613');
              cy.createTempUser([
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]).then((createdUser) => {
                user = createdUser;
                cy.then(() => {
                  cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                    (instanceTypes) => {
                      testData.instanceTypeId = instanceTypes[0].id;
                    },
                  );
                  InventoryInstances.getIdentifierTypes({ query: 'name="LCCN"' }).then(
                    (identifier) => {
                      testData.lccnTypeId = identifier.id;
                    },
                  );
                  InventoryInstances.getIdentifierTypes({ query: 'name="Canceled LCCN"' }).then(
                    (identifier) => {
                      testData.canceledLccnTypeId = identifier.id;
                    },
                  );
                }).then(() => {
                  // Create Folio instances with LCCN numbers and set them for deletion
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: testData.instanceTypeId,
                      title: `${folioInstancePrefix}_1`,
                      staffSuppress: true,
                      discoverySuppress: true,
                      deleted: true,
                      identifiers: [
                        {
                          identifierTypeId: testData.lccnTypeId,
                          value: testData.lccnValues[3],
                        },
                        {
                          identifierTypeId: testData.canceledLccnTypeId,
                          value: testData.lccnValues[4],
                        },
                      ],
                    },
                  }).then((specialInstanceIds) => {
                    createdInstanceIds.push(specialInstanceIds.instanceId);
                  });
                });

                // Import MARC bib records with LCCN numbers and set them for deletion
                DataImport.uploadFileViaApi(
                  testData.bibFile,
                  `${testData.bibFile.split('.')[0]}.${randomPostfix}.mrc`,
                  DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
                ).then((response) => {
                  response.forEach((record) => {
                    createdInstanceIds.push(record.instance.id);
                    cy.getInstanceById(record.instance.id).then((instanceData) => {
                      instanceData.staffSuppress = true;
                      instanceData.discoverySuppress = true;
                      instanceData.deleted = true;
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

              testData.lccnValues.forEach((lccnValue) => {
                QuickMarcEditor.updateLDR06And07Positions();
                QuickMarcEditor.updateExistingField('010', `$a ${lccnValue}`);
                QuickMarcEditor.clickSaveAndKeepEditingButton();
                QuickMarcEditor.checkAfterSaveAndKeepEditing();
                QuickMarcEditor.closeAllCallouts();
              });
            });
          },
        );
      });
    });
  });
});
