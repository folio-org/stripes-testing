import { including } from '@interactors/html';
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
        tag600: '600',
        tag700: '700',
        tag980: '980',
        tag981: '981',
        tag008: '008',
        instanceTitle:
          'AT_C514973_Create MARC bib with required/not required standard/local fields',
        field600: {
          indicators: ['\\', '\\'],
          content: '$a Standard Not required field',
        },
        field700: {
          indicators: ['\\', '\\'],
          content: '$a Standard Required field',
        },
        field980: {
          indicators: ['\\', '\\'],
          content: '$a Local required field',
        },
        field981: {
          indicators: ['\\', '\\'],
          content: '$a Local Not Required field',
        },
        successMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
        userProperties: {},
      };

      let specId;
      let field600;
      let field600Id;
      let originalField600Required;
      let field700;
      let field700Id;
      let field980Id;
      let field981Id;
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
              // Configure field 700 (standard) as required
              field700 = findStandardField(response.body.fields, testData.tag700);
              field700Id = field700.id;

              cy.updateSpecificationField(field700Id, {
                ...field700,
                required: true,
              });

              // Ensure field 600 (standard) is not required
              field600 = findStandardField(response.body.fields, testData.tag600);
              field600Id = field600.id;
              originalField600Required = field600.required;

              if (field600.required) {
                cy.updateSpecificationField(field600Id, {
                  ...field600,
                  required: false,
                });
              }

              // Delete existing field 980 if it exists
              const existingField980 = findLocalField(response.body.fields, testData.tag980);
              if (existingField980) {
                cy.deleteSpecificationField(existingField980.id, false);
              }

              // Create field 980 (local) as required
              const field980Data = generateTestFieldData('C514973', {
                tag: testData.tag980,
                label: 'Required_Local_Field',
                scope: 'local',
                repeatable: true,
                required: true,
              });

              cy.createSpecificationField(specId, field980Data, false).then((fieldResp) => {
                field980Id = fieldResp.body.id;
              });

              // Delete existing field 981 if it exists
              const existingField981 = findLocalField(response.body.fields, testData.tag981);
              if (existingField981) {
                cy.deleteSpecificationField(existingField981.id, false);
              }

              // Create field 981 (local) as not required
              const field981Data = generateTestFieldData('C514973', {
                tag: testData.tag981,
                label: 'Not_Required_Local_Field',
                scope: 'local',
                repeatable: true,
                required: false,
              });

              cy.createSpecificationField(specId, field981Data, false).then((fieldResp) => {
                field981Id = fieldResp.body.id;
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

        if (field600Id && originalField600Required) {
          cy.getSpecificationFields(specId).then((resp) => {
            const field = findStandardField(resp.body.fields, testData.tag600);
            if (field) {
              cy.updateSpecificationField(field600Id, {
                ...field,
                required: originalField600Required,
              });
            }
          });
        }

        if (field980Id) {
          cy.deleteSpecificationField(field980Id, false);
        }

        if (field981Id) {
          cy.deleteSpecificationField(field981Id, false);
        }

        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C514973 Create MARC bib record with required / not required fields (Standard and Local) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514973', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button in second pane >> Select "New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 3: Select any values from the dropdowns of "008" field which are highlighted in red
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );

          // Step 4: Add "245" field and Standard / Local required and not required fields
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle}`);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '\\', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '\\', 1);

          // Add field 600 (standard, not required)
          QuickMarcEditor.addNewField(testData.tag600, testData.field600.content, 4);
          QuickMarcEditor.updateIndicatorValue(testData.tag600, testData.field600.indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag600, testData.field600.indicators[1], 1);

          // Add field 700 (standard, required)
          QuickMarcEditor.addNewField(testData.tag700, testData.field700.content, 5);
          QuickMarcEditor.updateIndicatorValue(testData.tag700, testData.field700.indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag700, testData.field700.indicators[1], 1);

          // Add field 980 (local, required)
          QuickMarcEditor.addNewField(testData.tag980, testData.field980.content, 6);
          QuickMarcEditor.updateIndicatorValue(testData.tag980, testData.field980.indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag980, testData.field980.indicators[1], 1);

          // Add field 981 (local, not required)
          QuickMarcEditor.addNewField(testData.tag981, testData.field981.content, 7);
          QuickMarcEditor.updateIndicatorValue(testData.tag981, testData.field981.indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag981, testData.field981.indicators[1], 1);

          // Step 5: Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();

          // Verify success saving toast notification is displayed
          QuickMarcEditor.checkCallout(including(testData.successMessage));

          // Verify "Create a new MARC bib record" window is closed
          QuickMarcEditor.checkAfterSaveAndClose();

          // Verify detail view pane of created record is opened in the third pane
          InventoryInstance.waitLoading();

          // Capture instance ID for cleanup
          cy.url().then((url) => {
            createdInstanceId = url.split('/').pop();
          });

          // Verify instance title is displayed
          InventoryInstance.checkInstanceTitle(testData.instanceTitle);
        },
      );
    });
  });
});
