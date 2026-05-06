import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Optimistic locking', () => {
      const randomPostfix = getRandomPostfix();

      const marcFieldTags = {
        tag008: '008',
        tag245: '245',
      };

      const testData = {
        instanceTitleOriginal: `AT_C353226_MarcBibInstance_${randomPostfix}`,
        instanceTitleUpdatedByA: `AT_C353226_MarcBibInstance_${randomPostfix} Updated by A`,
        instanceTitleUpdatedByB: `AT_C353226_MarcBibInstance_${randomPostfix} Updated by B`,
        instanceTitleUpdatedByAFinal: `AT_C353226_MarcBibInstance_${randomPostfix} Final Update by A`,
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
      ];

      let userA;
      let userB;
      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C353226_');

        // Create MARC bib
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
          (instanceId) => {
            createdRecordIDs.push(instanceId);
          },
        );

        // Create User A
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          userA = userProperties;
        });

        // Create User B
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
        'C353226 Edit "MARC Bibliographic" record after conflict detection banner displays (Optimistic locking) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C353226'] },
        () => {
          // Step 1: User A logs in, opens record for editing
          cy.login(userA.username, userA.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          // Verify initial 245 field value
          QuickMarcEditor.checkContentByTag(
            marcFieldTags.tag245,
            `$a ${testData.instanceTitleOriginal}`,
          );

          // Steps 2-4: While User A has the record open, User B updates the record via API
          // This makes User A's version stale and triggers optimistic locking conflict
          cy.getToken(userB.username, userB.password).then(() => {
            cy.getMarcRecordDataViaAPI(createdRecordIDs[0]).then((marcData) => {
              const field245 = marcData.fields.find((f) => f.tag === marcFieldTags.tag245);
              field245.content = `$a ${testData.instanceTitleUpdatedByB}`;
              marcData.relatedRecordVersion = 1;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);
                  // Switch back to User A's token so UI continues under User A
                  cy.getToken(userA.username, userA.password);

                  // Steps 5-6: User A makes changes to 245 field, tries to save (will trigger conflict because record was updated by User B)
                  QuickMarcEditor.updateExistingField(
                    marcFieldTags.tag245,
                    `$a ${testData.instanceTitleUpdatedByA}`,
                  );
                  QuickMarcEditor.pressSaveAndCloseButton();
                  QuickMarcEditor.verifyOptimisticLockingBanner();

                  // Step 7: User A clicks "Cancel" button
                  QuickMarcEditor.pressCancel();
                  InventoryInstance.waitLoading();
                  InventoryInstance.waitInstanceRecordViewOpened();
                  InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedByB);

                  // Step 8: User A reopens record for editing
                  InventoryInstance.editMarcBibliographicRecord();
                  QuickMarcEditor.waitLoading();
                  // Verify it shows User B's updated value
                  QuickMarcEditor.checkContentByTag(
                    marcFieldTags.tag245,
                    `$a ${testData.instanceTitleUpdatedByB}`,
                  );

                  // Steps 9-10: User A makes new changes and saves successfully
                  QuickMarcEditor.updateExistingField(
                    marcFieldTags.tag245,
                    `$a ${testData.instanceTitleUpdatedByAFinal}`,
                  );
                  QuickMarcEditor.pressSaveAndCloseButton();
                  QuickMarcEditor.checkAfterSaveAndClose();
                  InventoryInstance.waitLoading();
                  InventoryInstance.waitInstanceRecordViewOpened();
                  InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedByAFinal);
                },
              );
            });
          });
        },
      );
    });
  });
});
