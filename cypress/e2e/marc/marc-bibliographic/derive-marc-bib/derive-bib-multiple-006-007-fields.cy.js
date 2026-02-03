import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  INVENTORY_006_FIELD_TYPE_DROPDOWN,
  INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_007_FIELD_TYPE_DROPDOWN,
  INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        title: `AT_C499607_MarcBibInstance_${getRandomPostfix()}`,
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

      let createdInstanceId;

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.createSimpleMarcBibViaAPI(testData.title).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.title);
      });

      it(
        'C499607 Derive existing "MARC bib" record with multiple "006" and "007" fields (which are "system" and repeatable) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C499607'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.updateLDR06And07Positions();

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

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkInstanceTitle(testData.title);

          InventoryInstance.editMarcBibliographicRecord();

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
