import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Optimistic locking', () => {
      const randomPostfix = getRandomPostfix();

      const marcFieldTags = {
        tag008: '008',
        tag245: '245',
        tag947: '947',
        tag948: '948',
      };

      const testData = {
        instanceTitleOriginal: `AT_C367950_MarcBibInstance_${randomPostfix}`,
        instanceTitleUpdatedByA: `AT_C367950_MarcBibInstance_${randomPostfix} Updated by A`,
        instanceTitleUpdatedByB: `AT_C367950_MarcBibInstance_${randomPostfix} Updated by B`,
        field947Content: '$a Initial 947 content',
        field948Content: '$a Initial 948 content',
        field948UpdatedByA: '$a Updated 948 by A',
        field947UpdatedByB: '$a Updated 947 by B',
      };

      const marcBibFields = [
        {
          tag: marcFieldTags.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: marcFieldTags.tag245,
          content: `$a ${testData.instanceTitleOriginal}`,
          indicators: ['1', '1'],
        },
        {
          tag: marcFieldTags.tag947,
          content: testData.field947Content,
          indicators: ['\\', '\\'],
        },
        {
          tag: marcFieldTags.tag948,
          content: testData.field948Content,
          indicators: ['\\', '\\'],
        },
      ];

      let userA;
      let userB;
      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C367950_');

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
          (instanceId) => {
            createdRecordIDs.push(instanceId);
          },
        );

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          userA = userProperties;
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          userB = userProperties;
        });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      });

      it(
        'C367950 "Optimistic locking" banner appears when edit MARC fields which mapped/not mapped to FOLIO instance by 2 different users (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C367950'] },
        () => {
          // Part 1: User B in UI edits mapped 245 field; User A saves via API first
          // Steps 1-2: User B opens record for editing
          cy.login(userB.username, userB.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag(
            marcFieldTags.tag245,
            `$a ${testData.instanceTitleOriginal}`,
          );

          // Step 2: User B updates 245 field (not saved yet)
          QuickMarcEditor.updateExistingField(
            marcFieldTags.tag245,
            `$a ${testData.instanceTitleUpdatedByB}`,
          );
          QuickMarcEditor.checkContentByTag(
            marcFieldTags.tag245,
            `$a ${testData.instanceTitleUpdatedByB}`,
          );

          // Steps 3-4: User A saves the record via API (bumps record version)
          cy.getToken(userA.username, userA.password).then(() => {
            cy.getMarcRecordDataViaAPI(createdRecordIDs[0]).then((marcData) => {
              const field245 = marcData.fields.find((f) => f.tag === marcFieldTags.tag245);
              field245.content = `$a ${testData.instanceTitleUpdatedByA}`;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);

                  // Restore User B's UI session
                  cy.getToken(userB.username, userB.password);

                  // Step 6: User B clicks "Save & keep editing" → OL banner appears
                  QuickMarcEditor.clickSaveAndKeepEditingButton();
                  QuickMarcEditor.verifyOptimisticLockingBanner();

                  // Step 7: User B clicks "Cancel" → detail view shows User A's saved version
                  QuickMarcEditor.pressCancel();
                  InventoryInstance.waitLoading();
                  InventoryInstance.waitInstanceRecordViewOpened();
                  InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedByA);

                  // Part 2: User A in UI edits unmapped 948 field; User B saves 947 via API first
                  // Steps 8-9: Switch to User A, open the same record for editing
                  cy.login(userA.username, userA.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                  });
                  InventoryInstances.searchByTitle(createdRecordIDs[0]);
                  InventoryInstances.selectInstanceById(createdRecordIDs[0]);
                  InventoryInstance.waitLoading();
                  InventoryInstance.waitInstanceRecordViewOpened();
                  InventoryInstance.editMarcBibliographicRecord();
                  QuickMarcEditor.waitLoading();

                  // Step 10: User A updates unmapped 948 field (not saved yet)
                  QuickMarcEditor.updateExistingField(
                    marcFieldTags.tag948,
                    testData.field948UpdatedByA,
                  );
                  QuickMarcEditor.checkContentByTag(
                    marcFieldTags.tag948,
                    testData.field948UpdatedByA,
                  );

                  // Steps 11-12: User B saves unmapped 947 field via API (bumps record version)
                  cy.getToken(userB.username, userB.password).then(() => {
                    cy.getMarcRecordDataViaAPI(createdRecordIDs[0]).then((marcData2) => {
                      const field947 = marcData2.fields.find((f) => f.tag === marcFieldTags.tag947);
                      field947.content = testData.field947UpdatedByB;
                      cy.updateMarcRecordDataViaAPI(marcData2.parsedRecordId, marcData2).then(
                        ({ status: status2 }) => {
                          expect(status2).to.eq(202);

                          // Restore User A's UI session
                          cy.getToken(userA.username, userA.password);

                          // Step 13: User A clicks "Save & keep editing" → OL banner appears
                          QuickMarcEditor.clickSaveAndKeepEditingButton();
                          QuickMarcEditor.verifyOptimisticLockingBanner();
                        },
                      );
                    });
                  });
                },
              );
            });
          });
        },
      );
    });
  });
});
