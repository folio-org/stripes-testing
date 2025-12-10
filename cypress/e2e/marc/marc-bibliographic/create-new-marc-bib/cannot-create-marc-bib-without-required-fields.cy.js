import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findStandardField,
  findLocalField,
  generateTestFieldData,
} from '../../../../support/api/specifications-helper';
import { INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tag245: '245',
        tag700: '700',
        tag980: '980',
        tag008: '008',
        instanceTitle: 'AT_C514967_Create MARC bib without required standard and local fields',
        requiredFieldErrors: ['Field 700 is required.', 'Field 980 is required.'],
        expectedFailCount: 2,
        userProperties: {},
      };

      let specId;
      let field700;
      let field700Id;
      let field980Id;
      let createdInstanceId;

      before('Create user and configure validation rules', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          getBibliographicSpec().then((bibSpec) => {
            specId = bibSpec.id;

            cy.getSpecificationFields(specId).then((response) => {
              field700 = findStandardField(response.body.fields, testData.tag700);
              field700Id = field700.id;

              cy.updateSpecificationField(field700Id, {
                ...field700,
                required: true,
              });

              const existingField980 = findLocalField(response.body.fields, testData.tag980);
              if (existingField980) {
                cy.deleteSpecificationField(existingField980.id, false);
              }

              const field980Data = generateTestFieldData('C514967', {
                tag: testData.tag980,
                label: 'Required_Local_Field',
                scope: 'local',
                repeatable: true,
                required: true,
              });

              cy.createSpecificationField(specId, field980Data, false).then((fieldResp) => {
                field980Id = fieldResp.body.id;
              });
            });
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete user and restore validation rules', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);

        if (createdInstanceId) {
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        }

        if (field700Id) {
          cy.getSpecificationFields(specId).then((resp) => {
            const field = findStandardField(resp.body.fields, testData.tag700);
            if (field) {
              cy.updateSpecificationField(field700Id, {
                ...field,
                required: false,
              });
            }
          });
        }

        if (field980Id) {
          cy.deleteSpecificationField(field980Id, false);
        }
      });

      it(
        'C514967 Cannot create MARC bib record without required fields (Standard and Local) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514967', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button >> Select "New MARC bibliographic record"
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(/New .*MARC bib record/);

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 3: Select any values from dropdowns of "008" field (verify no red highlights)
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );

          // Step 4: Add "245" field
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle}`);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 1);

          // Step 5: Make sure required fields 700 and 980 are not present
          QuickMarcEditor.checkTagAbsent(testData.tag700);
          QuickMarcEditor.checkTagAbsent(testData.tag980);

          // Step 6: Click "Save & close" and verify error messages
          QuickMarcEditor.pressSaveAndCloseButton();

          testData.requiredFieldErrors.forEach((errorMessage) => {
            QuickMarcEditor.checkCallout(errorMessage);
          });

          QuickMarcEditor.verifyValidationCallout(0, testData.expectedFailCount);

          QuickMarcEditor.checkButtonSaveAndCloseEnable();
        },
      );
    });
  });
});
