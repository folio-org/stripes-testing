import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        user: {},
        searchTitle: `AT_C422110_MarcBibInstance_${getRandomPostfix()}_1`,
        newRecordTitle: `AT_C422110_MarcBibInstance_${getRandomPostfix()}_2`,
        createdInstanceIds: [],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C422110_MarcBibInstance');
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          // Create a MARC bibliographic record via API for searching
          const marcBibFields = [
            {
              tag: '245',
              content: `$a ${testData.searchTitle}`,
              indicators: ['1', '0'],
            },
            { tag: '008', content: QuickMarcEditor.defaultValid008Values },
          ];

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              testData.createdInstanceIds.push(instanceId);
            },
          );

          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        testData.createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C422110 Detail view of created "MARC bibliographic" record is open automatically after creation when user is on search result list with one result (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422110'] },
        () => {
          // Step 1: Run search which will return only one existing MARC bibliographic record
          InventoryInstances.searchByTitle(testData.createdInstanceIds[0]);

          // Verify only one record is returned and detail view opens automatically
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceTitle(testData.searchTitle);

          // Step 2: Click on "Actions" button → Select "+ New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();

          // Step 3: Fill in the required fields with valid data
          // Fill 245 field with title value
          QuickMarcEditor.updateExistingField('245', `$a ${testData.newRecordTitle}`);

          // Select valid values in LDR positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();

          // Verify entered values are displayed and Save & close button is enabled
          QuickMarcEditor.checkContentByTag('245', `$a ${testData.newRecordTitle}`);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();

          // Step 4: Click on "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          // Verify success toast notification and detail view of created record opens
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceTitle(testData.newRecordTitle);
          InventoryInstance.getId().then((id) => {
            testData.createdInstanceIds.push(id);
          });
          // TO DO: Uncomment after STCOM-1461 is fixed:
          // InventoryInstance.checkCloseButtonInFocus();
        },
      );
    });
  });
});
