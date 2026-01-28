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
  INVENTORY_008_FIELD_INDX_DROPDOWN,
  INVENTORY_008_FIELD_CONF_DROPDOWN,
  INVENTORY_008_FIELD_FEST_DROPDOWN,
  INVENTORY_008_FIELD_LITF_DROPDOWN,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INSTANCE_DATE_TYPES,
} from '../../../../support/constants';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const instanceTitle = `AT_C553066_MarcBibInstance_${getRandomPostfix()}`;
      const paneHeaderCreateRecord = /Create a new .*MARC bib record/;
      const tagLDR = 'LDR';
      const tag245 = '245';
      const tag008 = '008';
      const dates = ['1781', '1911'];
      const user = {};

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
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
        'C553066 Create MARC bib with selected Date type and fields Date 1, Date 2 filled by digits (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C553066'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(paneHeaderCreateRecord);

          QuickMarcEditor.selectFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
            INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
            INVENTORY_008_FIELD_FEST_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
            INVENTORY_008_FIELD_INDX_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
            INVENTORY_008_FIELD_LITF_DROPDOWN.I,
          );
          [
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
          ].forEach((dropdownName) => {
            QuickMarcEditor.checkDropdownMarkedAsInvalid(tag008, dropdownName, false);
          });
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
          );

          QuickMarcEditor.updateExistingField(tag245, instanceTitle);
          QuickMarcEditor.checkContentByTag(tag245, instanceTitle);
          Object.values(INVENTORY_008_FIELD_DTST_DROPDOWN).forEach((dateTypeOption) => {
            QuickMarcEditor.verifyFieldsDropdownOption(
              tag008,
              INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
              dateTypeOption,
            );
          });
          QuickMarcEditor.selectFieldsDropdownOption(
            tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.P,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.P,
          );
          QuickMarcEditor.update008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            dates[0],
          );
          QuickMarcEditor.update008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            dates[1],
          );
          QuickMarcEditor.verify008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            dates[0],
          );
          QuickMarcEditor.verify008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            dates[1],
          );

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InstanceRecordView.verifyInstanceIsOpened(instanceTitle);
          InstanceRecordView.verifyDates(dates[0], dates[1], INSTANCE_DATE_TYPES.DISTRIBUTION);
        },
      );
    });
  });
});
