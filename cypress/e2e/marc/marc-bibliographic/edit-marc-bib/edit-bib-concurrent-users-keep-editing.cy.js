import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C360099_MarcBibInstance_${randomPostfix}`,
        tag008: '008',
        tag100: '100',
        tag245: '245',
        field100OriginalContent: '$a Original Author C360099',
        field100UpdatedContent: '$a Updated Author C360099',
        field245UpdatedContent: `AT_C360099_MarcBibInstance_UserA_upd_${randomPostfix}`,
        headerStatus: 'Current',
        conflictBannerMessage:
          'This record cannot be saved because it is not the most recent version.',
        viewLatestVersionLink: 'View latest version',
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag100,
          content: testData.field100OriginalContent,
          indicators: ['1', ' '],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
      ];

      let createdInstanceId;
      let userA;
      let userB;
      let adminUser;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getAdminSourceRecord().then((record) => {
          adminUser = record;
        });

        // Create User A - will perform UI actions
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userAProperties) => {
          userA = userAProperties;

          // Create User B - will perform API actions (simulating second browser)
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((userBProperties) => {
            userB = userBProperties;

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdInstanceId = instanceId;

                cy.login(userA.username, userA.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              },
            );
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
      });

      it(
        'C360099 Editing same "MARC Bibliographic" record by 2 different users (use "Save & keep editing" button) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C360099'] },
        () => {
          // Step 1: User A opens the MARC bib record for editing
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcBibHeader(
            {
              instanceTitle: testData.instanceTitle,
              status: testData.headerStatus,
            },
            adminUser,
          );
          QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100OriginalContent);

          // Step 2-4: User B (via API) opens, edits field 100 $a, and saves with "Save & keep editing"
          // Note: Since Cypress doesn't support multiple tabs, User B's actions are simulated via API
          cy.getToken(userB.username, userB.password);
          cy.getRecordDataInEditorViaApi(createdInstanceId).then((marcRecord) => {
            // Find and update field 100 $a
            const field100 = marcRecord.fields.find((field) => field.tag === testData.tag100);
            field100.content = testData.field100UpdatedContent;

            // Update the record via API (simulating User B's save action)
            cy.updateMarcRecordDataViaAPI(marcRecord.parsedRecordId, marcRecord);

            // Wait for the update to complete
            cy.recurse(
              () => cy.getRecordDataInEditorViaApi(createdInstanceId),
              (updatedBib) => updatedBib.fields.find((field) => field.tag === testData.tag100).content ===
                testData.field100UpdatedContent,
              { limit: 10, timeout: 12000, delay: 1000 },
            );
          });

          // Step 5-6: User A attempts to edit and save, triggering conflict detection
          QuickMarcEditor.updateExistingField(testData.tag245, testData.field245UpdatedContent);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();

          // Verify conflict detection banner appears
          QuickMarcEditor.verifyOptimisticLockingBanner();

          // Step 7: Click "View latest version" link
          QuickMarcEditor.clickViewLatestVersionLink();

          // Verify the updated instance is displayed
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceTitle(testData.instanceTitle);

          // Step 8: View source to verify User B's changes
          InventoryInstance.viewSource();
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.tag100,
            testData.field100UpdatedContent,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.tag245,
            testData.field245UpdatedContent,
            false,
          );
        },
      );
    });
  });
});
