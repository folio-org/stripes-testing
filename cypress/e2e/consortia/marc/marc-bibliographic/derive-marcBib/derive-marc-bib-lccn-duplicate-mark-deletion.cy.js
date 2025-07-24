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
    describe('Derive MARC bib', () => {
      describe('Consortia', () => {
        const testData = {
          bibFile: 'marcBibFileC569612.mrc',
          lccnValues: ['vp58020562569612', 'pv19951911569612'],
        };
        const randomPostfix = getRandomPostfix();
        const marcInstanceTitle = `AT_C569612_MarcBibInstance_${randomPostfix}`;
        const createdInstanceIds = [];
        let user;

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
          'C569612 Derive MARC bib record with "010 $a" subfield matched to others, marked as deleted records with "LCCN", "Canceled LCCN" fields when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C569612'] },
          () => {
            // Precondition moved to `before` hook to make sure `after` hook will always be executed
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C569612');
              cy.createTempUser([
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]).then((createdUser) => {
                user = createdUser;

                // Import MARC bib file
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

                // Create MARC bibliographic record to test deriving
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
              InventoryInstances.searchByTitle(marcInstanceTitle);
              InventoryInstances.selectInstanceByTitle(marcInstanceTitle);
              InventoryInstance.waitLoading();

              // Derive MARC bib record and validate LCCN
              testData.lccnValues.forEach((lccnValue) => {
                InventoryInstance.deriveNewMarcBibRecord();
                QuickMarcEditor.updateLDR06And07Positions();
                QuickMarcEditor.updateExistingField('010', `$a ${lccnValue}`);
                QuickMarcEditor.pressSaveAndClose();
                QuickMarcEditor.checkAfterSaveAndCloseDerive();
                InventoryInstance.getId().then((instanceId) => {
                  createdInstanceIds.push(instanceId);
                });
              });
            });
          },
        );
      });
    });
  });
});
