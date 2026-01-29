import getRandomPostfix from '../../../../support/utils/stringTools';
import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_008_FIELD_CONF_DROPDOWN,
  INVENTORY_008_FIELD_FEST_DROPDOWN,
  INVENTORY_008_FIELD_INDX_DROPDOWN,
  INVENTORY_008_FIELD_LITF_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const title = `AT_C709269_MarcBibInstance_${getRandomPostfix()}`;
      const tags = {
        tagLDR: 'LDR',
        tag008: '008',
        tag199: '199',
        tag245: '245',
      };
      const tag199Content = 'Undefined 1XX field';
      const errorPrefix = 'Fail:';
      const valid245indicatorValue = '1';

      let userProperties;

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          userProperties = createdUserProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(title);
      });

      it(
        'C709269 Create MARC bib record with using "Save & keep editing" button (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C709269'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.updateIndicatorValue(tags.tag245, valid245indicatorValue, 0);
          QuickMarcEditor.updateIndicatorValue(tags.tag245, valid245indicatorValue, 1);
          QuickMarcEditor.updateExistingField(tags.tag245, `$a ${title}`);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(0, errorPrefix);
          QuickMarcEditor.verifyValidationCallout(0, 1);
          QuickMarcEditor.verifyContentBoxIsFocused(tags.tag245);
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
          );
          QuickMarcEditor.checkOnlyBackslashesIn008Boxes();
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            true,
          );
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
            true,
          );

          QuickMarcEditor.addNewField(tags.tag199, tag199Content, 3);
          QuickMarcEditor.verifyTagValue(4, tags.tag199);
          QuickMarcEditor.updateExistingField(tags.tag245, `$a ${title}`);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(3, errorPrefix);
          QuickMarcEditor.verifyValidationCallout(0, 5);
          QuickMarcEditor.verifyContentBoxIsFocused(tags.tag245);
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
            INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
            INVENTORY_008_FIELD_FEST_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
            INVENTORY_008_FIELD_INDX_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
            INVENTORY_008_FIELD_LITF_DROPDOWN.I,
          );
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
            false,
          );
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkUserNameInHeader(userProperties.firstName, userProperties.lastName);
        },
      );
    });
  });
});
