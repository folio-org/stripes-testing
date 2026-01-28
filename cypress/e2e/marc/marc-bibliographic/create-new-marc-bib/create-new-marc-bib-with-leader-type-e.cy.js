import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
  INVENTORY_008_FIELD_CRTP_DROPDOWN,
  INVENTORY_008_FIELD_INDX_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const instanceTitle = `C422119 The most important book ${getRandomPostfix()}`;
      const field245Value = { tag: '245', value: `$a ${instanceTitle}` };
      const paneHeaderCreateRecord = /Create a new .*MARC bib record/;
      const paneHeaderEditRecord = /Edit .*MARC record/;
      const tagLDR = 'LDR';
      const tag008 = '008';
      const optionsIn008FieldRelfDropdowns = [
        'a - Contours',
        'b - Shading',
        'c - Gradient and bathymetric tints',
        'd - Hachures',
      ];
      const user = {};

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((createdUserProperties) => {
          user.userProperties = createdUserProperties;

          cy.login(user.userProperties.username, user.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
      });

      it(
        'C422119 Create new "MARC bib" with leader "Type" position="e" and valid values in 008 "Relf" position (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C422119'] },
        () => {
          // 1 Click on the "Actions" button placed on the second pane → Select "+ New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(paneHeaderCreateRecord);

          // 2 Select following values in "Type" and "BLvl" dropdowns of "LDR" field:"Type" = e, "BLvl" = a
          QuickMarcEditor.selectFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.E,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
          );
          QuickMarcEditor.verifyFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.E,
          );
          QuickMarcEditor.verifyFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
          );
          cy.wait(1000);

          // 3 Select any values from the dropdowns of "008" field which are highlighted in red
          QuickMarcEditor.selectFieldsDropdownOption(
            tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            '| - No attempt to code',
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CRTP,
            INVENTORY_008_FIELD_CRTP_DROPDOWN.NO,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
            INVENTORY_008_FIELD_INDX_DROPDOWN.NO,
          );

          // 4 Select following values in drodpwowns of "Relf" postion of "008" field:
          // Relf (1st box) = a
          // Relf (2nd box) = b
          // Relf (3rd box) = c
          // Relf (4th box) = d
          QuickMarcEditor.selectOptionsIn008FieldRelfDropdowns(...optionsIn008FieldRelfDropdowns);
          QuickMarcEditor.checkOptionsSelectedIn008FieldRelfDropdowns(
            ...optionsIn008FieldRelfDropdowns,
          );

          // 5 Fill in the required fields with valid data
          QuickMarcEditor.updateExistingField(field245Value.tag, field245Value.value);
          QuickMarcEditor.checkContentByTag(field245Value.tag, field245Value.value);
          cy.wait(1000);

          // 6 Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          // 7 Click on "Actions" button in third pane → Select "Edit MARC bibliographic record" option
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkPaneheaderContains(paneHeaderEditRecord);
          QuickMarcEditor.checkOptionsSelectedIn008FieldRelfDropdowns(
            ...optionsIn008FieldRelfDropdowns,
          );
        },
      );
    });
  });
});
