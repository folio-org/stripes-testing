import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  INVENTORY_006_FIELD_TYPE_DROPDOWN,
  INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_007_FIELD_TYPE_DROPDOWN,
  INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C407733_FieldsOrderTest_${getRandomPostfix()}`,
        createdInstanceId: null,
        tags: {
          tag245: '245',
          tag002: '002',
          tag004: '004',
          tag006: '006',
          tag007: '007',
          tag009: '009',
          tag010: '010',
          tag035: '035',
          tag100: '100',
          tag240: '240',
          tag600: '600',
          tag650: '650',
          tag700: '700',
          tag800: '800',
        },
        fieldValues: {
          tag002: '$a AT_C407733_smth002',
          tag004: '$a AT_C407733_smth004',
          tag009: '$a AT_C407733_smth009',
          tag010: '$a lc123',
          tag035First: '$a 1234',
          tag035Second: '$a 12345',
          tag100: '$a AT_C407733_smth100',
          tag240: '$a AT_C407733_smth240',
          tag600: '$a AT_C407733_subject600',
          tag650: '$a AT_C407733_subject650',
          tag700: '$a AT_C407733_contributor700',
          tag800: '$a AT_C407733_series800',
        },
        // Expected order after save (including system-generated 001 and 005)
        expectedOrderInEdit: [
          'LDR',
          '001',
          '005',
          '008',
          '245',
          '800',
          '700',
          '650',
          '600',
          '240',
          '100',
          '035',
          '035',
          '010',
          '009',
          '007',
          '006',
          '004',
          '002',
          '999',
        ],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (testData.createdInstanceId) {
          InventoryInstance.deleteInstanceViaApi(testData.createdInstanceId);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C407733 Verify that all fields (except "LDR", "005", "999") can be moved and saved when creating a new "MARC bibliographic" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C407733'] },
        () => {
          // Step 1: Open New MARC bib record editor
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          // Verify initial fields are present
          QuickMarcEditor.checkContent('', 1); // 001 - empty initially
          QuickMarcEditor.checkContent('', 2); // 005 - empty initially
          QuickMarcEditor.checkContentByTag('245', '$a '); // 245 - empty initially
          QuickMarcEditor.verifyTagFieldAfterUnlinking(5, '999', 'f', 'f', '');

          // Verify arrow icons absence for non-movable fields
          QuickMarcEditor.verifyEditableFieldIcons(0, false, false, false, false); // LDR
          QuickMarcEditor.verifyEditableFieldIcons(1, false, false, false, false); // 001
          QuickMarcEditor.verifyEditableFieldIcons(2, false, false, false, false); // 005
          QuickMarcEditor.verifyEditableFieldIcons(5, false, false, false, false); // 999

          // Step 2: Fill 245 field
          QuickMarcEditor.updateExistingField(testData.tags.tag245, testData.instanceTitle);
          QuickMarcEditor.checkContentByTag(testData.tags.tag245, testData.instanceTitle);

          // Step 3-4: Set LDR positions and handle 008 field
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 5: Add new fields
          // Current rows after 245 (row 4): adding fields one by one
          let currentRow = 4;

          // Add 002 field
          QuickMarcEditor.addNewField(
            testData.tags.tag002,
            testData.fieldValues.tag002,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag002, currentRow);

          // Add 004 field
          QuickMarcEditor.addNewField(
            testData.tags.tag004,
            testData.fieldValues.tag004,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag004, currentRow);

          // Add 006 field
          QuickMarcEditor.addNewField(testData.tags.tag006, '', currentRow++);
          QuickMarcEditor.verifyTagValue(currentRow, testData.tags.tag006);
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag006,
            INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
            INVENTORY_006_FIELD_TYPE_DROPDOWN.O,
          );

          // Add 007 field
          QuickMarcEditor.addNewField(testData.tags.tag007, '', currentRow++);
          QuickMarcEditor.verifyTagValue(currentRow, testData.tags.tag007);
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
            INVENTORY_007_FIELD_TYPE_DROPDOWN.T,
          );

          // Add 009 field
          QuickMarcEditor.addNewField(
            testData.tags.tag009,
            testData.fieldValues.tag009,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag009, currentRow);

          // Add 010 field
          QuickMarcEditor.addNewField(
            testData.tags.tag010,
            testData.fieldValues.tag010,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag010, currentRow);

          // Add first 035 field
          QuickMarcEditor.addNewField(
            testData.tags.tag035,
            testData.fieldValues.tag035First,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag035First, currentRow);

          // Add second 035 field
          QuickMarcEditor.addNewField(
            testData.tags.tag035,
            testData.fieldValues.tag035Second,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag035Second, currentRow);

          // Add 100 field
          QuickMarcEditor.addNewField(
            testData.tags.tag100,
            testData.fieldValues.tag100,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag100, currentRow);

          // Add 240 field
          QuickMarcEditor.addNewField(
            testData.tags.tag240,
            testData.fieldValues.tag240,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag240, currentRow);

          // Add 600 field
          QuickMarcEditor.addNewField(
            testData.tags.tag600,
            testData.fieldValues.tag600,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag600, currentRow);

          // Add 650 field
          QuickMarcEditor.addNewField(
            testData.tags.tag650,
            testData.fieldValues.tag650,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag650, currentRow);

          // Add 700 field
          QuickMarcEditor.addNewField(
            testData.tags.tag700,
            testData.fieldValues.tag700,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag700, currentRow);

          // Add 800 field
          QuickMarcEditor.addNewField(
            testData.tags.tag800,
            testData.fieldValues.tag800,
            currentRow++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.tag800, currentRow);

          // Verify arrow icons are displayed for movable fields
          QuickMarcEditor.verifyEditableFieldIcons(3, false, true, false); // 008 - only down arrow
          QuickMarcEditor.verifyEditableFieldIcons(4, true, true, false); // 245
          QuickMarcEditor.verifyEditableFieldIcons(currentRow, true, false); // Last added field - only up arrow

          // Step 6: Rearrange fields to desired order using move operations
          const targetRow = 3; // skipping LDR(0), 001(1), 005(2)
          const rowsToMove = Object.keys(testData.tags).length;
          for (let i = targetRow; i <= rowsToMove + 1; i++) {
            for (let j = currentRow; j >= targetRow + i; j--) {
              QuickMarcEditor.moveFieldUp(j);
              cy.wait(100);
            }
          }

          // Step 7: Save and close
          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.waitLoading();

          // Capture instance ID for cleanup
          cy.url().then((url) => {
            testData.createdInstanceId = url.split('/').pop();
          });

          // Step 8: Verify order in edit mode
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // Verify key fields are in expected positions
          QuickMarcEditor.verifyRowOrderByTags(testData.expectedOrderInEdit);

          // Step 9: Close editor and verify in source view
          QuickMarcEditor.closeEditorPane();
          InventoryInstance.viewSource();

          // Verify specific field content in source
          const sourceViewTagsOrder = [...testData.expectedOrderInEdit];
          // sourceViewTagsOrder[0] = ''; // Exclude LDR for source view check
          InventoryViewSource.verifyFieldsOrder(sourceViewTagsOrder);
        },
      );
    });
  });
});
