import getRandomPostfix from '../../../../support/utils/stringTools';
import { Permissions } from '../../../../support/dictionary';
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
      const title = `AT_C499624_MarcBibInstance_${getRandomPostfix()}`;
      const tags = {
        tag006: '006',
        tag007: '007',
      };
      const getLengthErrorText = (box, expectedLength) => `Fail: Invalid ${box} field length, must be ${expectedLength} characters.`;

      const editData = [
        {
          tag006Type: INVENTORY_006_FIELD_TYPE_DROPDOWN.C,
          tag007type: INVENTORY_007_FIELD_TYPE_DROPDOWN.C,
          editBoxes: [
            {
              field: tags.tag006,
              box: INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
              value: '\\',
            },
            {
              field: tags.tag007,
              box: INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.IBD,
              value: '\\\\',
            },
          ],
          field006Errors: [getLengthErrorText(INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP, 2)],
          field007Errors: [getLengthErrorText(INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.IBD, 3)],
        },
        {
          tag006Type: INVENTORY_006_FIELD_TYPE_DROPDOWN.D,
          tag007type: INVENTORY_007_FIELD_TYPE_DROPDOWN.F,
          editBoxes: [
            {
              field: tags.tag006,
              box: INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
              value: '\\',
            },
            {
              field: tags.tag007,
              box: INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.COBRWR,
              value: '\\',
            },
            {
              field: tags.tag007,
              box: INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.BMF,
              value: '\\\\',
            },
          ],
          field006Errors: [getLengthErrorText(INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP, 2)],
          field007Errors: [
            getLengthErrorText(INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.COBRWR, 2),
            getLengthErrorText(INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.BMF, 3),
          ],
        },
        {
          tag006Type: INVENTORY_006_FIELD_TYPE_DROPDOWN.E,
          tag007type: INVENTORY_007_FIELD_TYPE_DROPDOWN.H,
          editBoxes: [
            {
              field: tags.tag006,
              box: INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.PROJ,
              value: '\\',
            },
            {
              field: tags.tag007,
              box: INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.RRRRR,
              value: '\\\\\\',
            },
          ],
          field006Errors: [getLengthErrorText(INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.PROJ, 2)],
          field007Errors: [getLengthErrorText(INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.RRRRR, 4)],
        },
        {
          tag006Type: INVENTORY_006_FIELD_TYPE_DROPDOWN.F,
          tag007type: INVENTORY_007_FIELD_TYPE_DROPDOWN.M,
          editBoxes: [
            {
              field: tags.tag006,
              box: INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.PROJ,
              value: '\\',
            },
            {
              field: tags.tag007,
              box: INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.FID,
              value: '\\\\\\\\\\',
            },
          ],
          field006Errors: [getLengthErrorText(INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.PROJ, 2)],
          field007Errors: [getLengthErrorText(INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.FID, 6)],
        },
        {
          tag006Type: INVENTORY_006_FIELD_TYPE_DROPDOWN.I,
          tag007type: INVENTORY_007_FIELD_TYPE_DROPDOWN.R,
          editBoxes: [
            {
              field: tags.tag006,
              box: INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
              value: '\\',
            },
            {
              field: tags.tag007,
              box: INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.DATATYPE,
              value: '\\',
            },
          ],
          field006Errors: [getLengthErrorText(INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP, 2)],
          field007Errors: [
            getLengthErrorText(INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.DATATYPE, 2),
          ],
        },
        {
          tag006Type: INVENTORY_006_FIELD_TYPE_DROPDOWN.J,
          tag007type: INVENTORY_007_FIELD_TYPE_DROPDOWN.R,
          editBoxes: [
            {
              field: tags.tag006,
              box: INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
              value: '\\',
            },
          ],
          field006Errors: [getLengthErrorText(INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP, 2)],
          field007Errors: [
            getLengthErrorText(INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.DATATYPE, 2),
          ],
        },
      ];

      let userProperties;
      let createdInstanceId;

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          userProperties = createdUserProperties;

          cy.createSimpleMarcBibViaAPI(title).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(title);
      });

      it(
        'C499624 Cannot derive "MARC bib" record with invalid length "006" and "007" fields (which are "system") (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C499624'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.addNewField(tags.tag006, '', 3);
          QuickMarcEditor.verifyTagValue(4, tags.tag006);
          QuickMarcEditor.addNewField(tags.tag007, '', 4);
          QuickMarcEditor.verifyTagValue(5, tags.tag007);

          editData.forEach((edit) => {
            QuickMarcEditor.selectFieldsDropdownOption(
              tags.tag006,
              INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
              edit.tag006Type,
            );
            QuickMarcEditor.selectFieldsDropdownOption(
              tags.tag007,
              INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
              edit.tag007type,
            );
            edit.editBoxes.forEach((box) => {
              QuickMarcEditor.fillInTextBoxInField(box.field, box.box, box.value);
            });
            QuickMarcEditor.pressSaveAndCloseButton();
            edit.field006Errors.forEach((error) => {
              QuickMarcEditor.checkErrorMessage(4, error);
            });
            edit.field007Errors.forEach((error) => {
              QuickMarcEditor.checkErrorMessage(5, error);
            });
            QuickMarcEditor.verifyValidationCallout(
              undefined,
              edit.field006Errors.length + edit.field007Errors.length,
            );
            QuickMarcEditor.closeAllCallouts();
          });

          QuickMarcEditor.fillInTextBoxInField(
            tags.tag006,
            INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
            'xx',
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
            INVENTORY_007_FIELD_TYPE_DROPDOWN.H,
          );
          QuickMarcEditor.fillInTextBoxInField(
            tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.RRRRR,
            'e037',
          );
          QuickMarcEditor.verifyTextBoxValueInField(
            tags.tag006,
            INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
            'xx',
          );
          QuickMarcEditor.verifyTextBoxValueInField(
            tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.RRRRR,
            'e037',
          );

          QuickMarcEditor.addNewField(tags.tag007, '', 5);
          QuickMarcEditor.verifyTagValue(6, tags.tag007);
          QuickMarcEditor.selectFieldsDropdownOption(
            tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
            INVENTORY_007_FIELD_TYPE_DROPDOWN.G,
            6,
          );
          QuickMarcEditor.fillInTextBoxInField(
            tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.MFS,
            'a',
            6,
          );
          QuickMarcEditor.verifyTextBoxValueInField(
            tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.MFS,
            'a',
            6,
          );

          QuickMarcEditor.saveAndCloseWithValidationWarnings();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkInstanceTitle(title);

          InventoryInstance.editMarcBibliographicRecord();

          QuickMarcEditor.verifyTextBoxValueInField(
            tags.tag006,
            INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
            'xx',
            4,
          );
          QuickMarcEditor.verifyTextBoxValueInField(
            tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.RRRRR,
            'e037',
            5,
          );
          QuickMarcEditor.verifyTextBoxValueInField(
            tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.MFS,
            'a',
            6,
          );
        },
      );
    });
  });
});
