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
} from '../../../../support/constants';
import inventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        title: `AT_C343205_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag006: '006',
          tag245: '245',
        },
        typeDropdownLabel: INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
        tag006TypeValue: INVENTORY_006_FIELD_TYPE_DROPDOWN.C,
        tag006BoxesValues: [
          { label: INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP, value: 'co' },
          { label: INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.AUDN, value: 'a' },
          { label: INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.FORM, value: 'f' },
        ],
        tag245Index: 4,
        userProperties: {},
      };

      const tag006SourcePart = `\t${testData.tags.tag006}\tc`;

      let createdInstanceId;

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
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
            }, 20_000);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C343205 Edit MARC 006 tag of "MARC bibliographic" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C343205'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.addNewField(testData.tags.tag006, '', testData.tag245Index);
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag006,
            testData.typeDropdownLabel,
            testData.tag006TypeValue,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tags.tag006,
            testData.typeDropdownLabel,
            testData.tag006TypeValue,
          );

          testData.tag006BoxesValues.forEach((box) => {
            QuickMarcEditor.fillInTextBoxInField(testData.tags.tag006, box.label, box.value);
          });
          testData.tag006BoxesValues.forEach((box) => {
            QuickMarcEditor.verifyTextBoxValueInField(testData.tags.tag006, box.label, box.value);
          });

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          InventoryInstance.viewSource();
          inventoryViewSource.contains(tag006SourcePart);
        },
      );
    });
  });
});
