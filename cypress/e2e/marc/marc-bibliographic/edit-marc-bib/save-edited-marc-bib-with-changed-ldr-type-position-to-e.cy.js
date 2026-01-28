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
  INVENTORY_008_FIELD_CRTP_DROPDOWN,
  INVENTORY_008_FIELD_INDX_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const instanceTitle = `C422106 Test instance title ${getRandomPostfix()}`;
      const paneHeader = /Edit .*MARC record/;
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
        ]).then((createdUserProperties) => {
          user.userProperties = createdUserProperties;
          cy.createSimpleMarcBibViaAPI(instanceTitle);
          cy.login(user.userProperties.username, user.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.searchByTitle(instanceTitle);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
      });

      it(
        'C422106 Save edited "MARC bib" with changed leader "Type" position to "e" and valid values in 008 "Relf" position (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C422106'] },
        () => {
          // 1 Click on the "Actions" button placed on the second pane → Select "Edit MARC bibliographic record" option
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkPaneheaderContains(paneHeader);
          QuickMarcEditor.verifyFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
          );

          // 2 Select following values in "Type" dropdown of "LDR" field: "Type" = e
          QuickMarcEditor.selectFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.E,
          );
          QuickMarcEditor.verifyFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.E,
          );
          cy.wait(1000);

          // 3 Select following values in drodpwowns of "Relf" postion of "008" field:
          // Relf (1st box) = a
          // Relf (2nd box) = b
          // Relf (3rd box) = c
          // Relf (4th box) = d
          QuickMarcEditor.selectOptionsIn008FieldRelfDropdowns(...optionsIn008FieldRelfDropdowns);
          QuickMarcEditor.checkOptionsSelectedIn008FieldRelfDropdowns(
            ...optionsIn008FieldRelfDropdowns,
          );

          // 4 Select any values in dropdowns of "008" field which are highlighted in red
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

          // 5 Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          // 6 Click on "Actions" button in third pane → Select "Edit MARC bibliographic record" option
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkPaneheaderContains(paneHeader);
          QuickMarcEditor.checkOptionsSelectedIn008FieldRelfDropdowns(
            ...optionsIn008FieldRelfDropdowns,
          );
        },
      );
    });
  });
});
