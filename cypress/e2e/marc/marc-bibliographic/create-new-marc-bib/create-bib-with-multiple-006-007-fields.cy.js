import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_006_FIELD_TYPE_DROPDOWN,
  INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_007_FIELD_TYPE_DROPDOWN,
  INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        title: `AT_C496233_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag006: '006',
          tag007: '007',
          tag008: '008',
          tag245: '245',
        },
        fields006: [
          { content: INVENTORY_006_FIELD_TYPE_DROPDOWN.A, rowIndex: 4 },
          { content: INVENTORY_006_FIELD_TYPE_DROPDOWN.D, rowIndex: 5 },
        ],
        fields007: [
          { content: INVENTORY_007_FIELD_TYPE_DROPDOWN.A, rowIndex: 6 },
          { content: INVENTORY_007_FIELD_TYPE_DROPDOWN.C, rowIndex: 7 },
        ],
        userProperties: {},
      };

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.title);
      });

      it(
        'C496233 Create "MARC bib" record with multiple "006" and "007" fields (which are "system", repeatable) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C496233'] },
        () => {
          // test change
          // Step 1: Click on "Actions" button → Select "+ New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          // Step 3: Select any values from the dropdowns of "008" field which are highlighted in red
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );

          // Step 4: Fill in "$a" subfield of "245" with some valid value
          QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.title}`);

          // Step 5: Add multiple "006" and "007" fields
          testData.fields006.forEach((field) => {
            QuickMarcEditor.addNewField(testData.tags.tag006, '', field.rowIndex - 1);
            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tags.tag006,
              INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
              field.content,
              field.rowIndex,
            );
            QuickMarcEditor.verifyDropdownOptionChecked(
              testData.tags.tag006,
              INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
              field.content,
              field.rowIndex,
            );
          });

          testData.fields007.forEach((field) => {
            QuickMarcEditor.addNewField(testData.tags.tag007, '', field.rowIndex - 1);
            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tags.tag007,
              INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
              field.content,
              field.rowIndex,
            );
            QuickMarcEditor.verifyDropdownOptionChecked(
              testData.tags.tag007,
              INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
              field.content,
              field.rowIndex,
            );
          });

          // Step 6: Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.title);

          // Step 7: Edit MARC bibliographic record to verify multiple fields persist
          InventoryInstance.editMarcBibliographicRecord();

          // Verify multiple "006" and "007" fields are displayed
          testData.fields006.forEach((field) => {
            QuickMarcEditor.verifyDropdownOptionChecked(
              testData.tags.tag006,
              INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
              field.content,
              field.rowIndex,
            );
          });

          testData.fields007.forEach((field) => {
            QuickMarcEditor.verifyDropdownOptionChecked(
              testData.tags.tag007,
              INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
              field.content,
              field.rowIndex,
            );
          });
        },
      );
    });
  });
});
