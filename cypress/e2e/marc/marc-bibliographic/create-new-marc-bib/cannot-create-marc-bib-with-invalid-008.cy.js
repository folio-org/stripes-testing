import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import {
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tag245Content: 'C503013 Autotest Instance',
        updatedCtryValue: '\\\\',
        ctryErrorText: 'Fail: Invalid Ctry field length, must be 3 characters.',
        tag008ErrorText: (position) => `Fail: Record cannot be saved. Field 008 contains an invalid value in "${position}" position.`,
      };
      const tags = {
        tagLDR: 'LDR',
        tag245: '245',
        tag008: '008',
      };
      const boxes = {
        ldrType: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
        ldrBlvl: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
        tag008Dtst: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
        tag008Ctry: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
        tag008Conf: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
        tag008Fest: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
        tag008Indx: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
        tag008Litf: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
      };
      const values = {
        ldrTypeA: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
        ldrBlvlA: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
        tag008No: INVENTORY_008_FIELD_DTST_DROPDOWN.NO,
      };

      before(() => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C503013 Cannot create "MARC bibliographic" record with not valid values in "008" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C503013'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.checkDropdownMarkedAsInvalid(tags.tagLDR, boxes.ldrType);
          QuickMarcEditor.checkDropdownMarkedAsInvalid(tags.tagLDR, boxes.ldrBlvl);
          QuickMarcEditor.selectFieldsDropdownOption(tags.tagLDR, boxes.ldrType, values.ldrTypeA);
          QuickMarcEditor.selectFieldsDropdownOption(tags.tagLDR, boxes.ldrBlvl, values.ldrBlvlA);
          QuickMarcEditor.checkDropdownMarkedAsInvalid(tags.tagLDR, boxes.ldrType, false);
          QuickMarcEditor.checkDropdownMarkedAsInvalid(tags.tagLDR, boxes.ldrBlvl, false);
          [
            boxes.tag008Dtst,
            boxes.tag008Conf,
            boxes.tag008Fest,
            boxes.tag008Indx,
            boxes.tag008Litf,
          ].forEach((positionWithInvalid) => {
            QuickMarcEditor.checkDropdownMarkedAsInvalid(tags.tag008, positionWithInvalid);
          });
          QuickMarcEditor.updateExistingField(tags.tag245, testData.tag245Content);
          QuickMarcEditor.pressSaveAndCloseButton();
          [
            boxes.tag008Dtst,
            boxes.tag008Conf,
            boxes.tag008Fest,
            boxes.tag008Indx,
            boxes.tag008Litf,
          ].forEach((positionWithInvalid) => {
            QuickMarcEditor.checkErrorMessage(3, testData.tag008ErrorText(positionWithInvalid));
          });
          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tag008,
            boxes.tag008Dtst,
            values.tag008No,
          );
          QuickMarcEditor.checkDropdownMarkedAsInvalid(tags.tag008, boxes.tag008Dtst, false);
          [boxes.tag008Conf, boxes.tag008Fest, boxes.tag008Indx, boxes.tag008Litf].forEach(
            (positionWithInvalid) => {
              QuickMarcEditor.checkDropdownMarkedAsInvalid(tags.tag008, positionWithInvalid);
            },
          );
          QuickMarcEditor.pressSaveAndCloseButton();
          [boxes.tag008Conf, boxes.tag008Fest, boxes.tag008Indx, boxes.tag008Litf].forEach(
            (positionWithInvalid) => {
              QuickMarcEditor.checkErrorMessage(3, testData.tag008ErrorText(positionWithInvalid));
            },
          );
          QuickMarcEditor.checkErrorMessage(3, testData.tag008ErrorText(boxes.tag008Dtst), false);
          [boxes.tag008Conf, boxes.tag008Fest, boxes.tag008Indx, boxes.tag008Litf].forEach(
            (position) => {
              QuickMarcEditor.selectFieldsDropdownOption(tags.tag008, position, values.tag008No);
            },
          );
          [
            boxes.tag008Dtst,
            boxes.tag008Conf,
            boxes.tag008Fest,
            boxes.tag008Indx,
            boxes.tag008Litf,
          ].forEach((position) => {
            QuickMarcEditor.checkDropdownMarkedAsInvalid(tags.tag008, position, false);
          });
          QuickMarcEditor.update008TextFields(boxes.tag008Ctry, testData.updatedCtryValue);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(3, testData.ctryErrorText);
        },
      );
    });
  });
});
