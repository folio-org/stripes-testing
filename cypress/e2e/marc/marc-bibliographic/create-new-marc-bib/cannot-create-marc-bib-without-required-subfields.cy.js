import { including } from '@interactors/html';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findSystemField,
  findStandardSubfield,
  findLocalSubfield,
  generateTestFieldData,
  generateSubfieldData,
  generateIndicatorData,
  generateIndicatorCodeData,
  findLocalField,
} from '../../../../support/api/specifications-helper';
import { INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tag245: '245',
        tag981: '981',
        tag008: '008',
        field245: {
          indicators: ['1', '2'],
          contentWithoutRequired:
            '$b Create MARC bib without required standard and appended Subfield codes',
          contentWithEmptySubfields: '$b Create MARC bib $a $l',
          contentWithEmptySubfieldsAndWhitespace: '$b Create MARC bib $a  $l ',
        },
        field981: {
          indicators: ['\\', '\\'],
          contentWithoutRequired: '$b No required Subfield code',
        },
        expectedErrors: {
          field245SubfieldA: "Fail: Subfield 'a' is required.",
          field245SubfieldL: "Fail: Subfield 'l' is required.",
          field981SubfieldA: "Fail: Subfield 'a' is required.",
        },
        expectedWarningCount: 1,
        expectedFailCount: 3,
        userProperties: {},
      };

      let specId;
      let field245;
      let subfieldAId;
      let subfieldLId;
      let field981Id;
      let indicator1Id;
      let indicator2Id;
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
            // Setup Field 245 subfields
            cy.getSpecificationFields(specId)
              .then((response) => {
                field245 = findSystemField(response.body.fields, testData.tag245);

                cy.getSpecificationFieldSubfields(field245.id).then((subfieldsResp) => {
                  const subfieldA = findStandardSubfield(subfieldsResp.body.subfields, 'a');
                  subfieldAId = subfieldA.id;

                  // Mark standard subfield 'a' as required
                  cy.updateSpecificationSubfield(subfieldAId, {
                    ...subfieldA,
                    required: true,
                  });

                  // Check if appended subfield 'l' exists, if not create it
                  const subfieldL = findLocalSubfield(subfieldsResp.body.subfields, 'l');
                  if (subfieldL) {
                    subfieldLId = subfieldL.id;
                    cy.updateSpecificationSubfield(subfieldLId, {
                      ...subfieldL,
                      required: true,
                    });
                  } else {
                    // Create appended subfield 'l' as required
                    const subfieldLData = generateSubfieldData('C514912', 'l', {
                      label: 'Language_Appended',
                      required: true,
                      scope: 'local',
                    });
                    cy.createSpecificationFieldSubfield(field245.id, subfieldLData).then((resp) => {
                      subfieldLId = resp.body.id;
                    });
                  }
                });

                const field981 = findLocalField(response.body.fields, testData.tag981);
                if (field981) {
                  cy.deleteSpecificationField(field981.id, false);
                }
              })
              .then(() => {
                // Setup Local Field 981
                const field981Data = generateTestFieldData('C514912', {
                  tag: '981',
                  label: 'Local_Field_981',
                  scope: 'local',
                  repeatable: true,
                  required: false,
                });

                cy.createSpecificationField(specId, field981Data, false).then((fieldResp) => {
                  field981Id = fieldResp.body.id;

                  // Create required subfield 'a' for field 981
                  const subfieldAData = generateSubfieldData('C514912', 'a', {
                    label: 'Required_Subfield_A',
                    required: true,
                    scope: 'local',
                  });

                  cy.createSpecificationFieldSubfield(field981Id, subfieldAData);

                  // Note: Subfield 'b' intentionally not created - will be undefined

                  // Create indicators for field 981
                  const indicator1Data = generateIndicatorData('C514912', 1, {
                    label: 'Indicator_1',
                  });
                  const indicator2Data = generateIndicatorData('C514912', 2, {
                    label: 'Indicator_2',
                  });

                  cy.createSpecificationFieldIndicator(field981Id, indicator1Data).then(
                    (ind1Resp) => {
                      indicator1Id = ind1Resp.body.id;

                      // Create blank indicator code for Ind1
                      const indCode1Data = generateIndicatorCodeData('C514912', '#', {
                        label: 'Blank_Code',
                      });
                      cy.createSpecificationIndicatorCode(indicator1Id, indCode1Data);
                    },
                  );

                  cy.createSpecificationFieldIndicator(field981Id, indicator2Data).then(
                    (ind2Resp) => {
                      indicator2Id = ind2Resp.body.id;

                      // Create blank indicator code for Ind2
                      const indCode2Data = generateIndicatorCodeData('C514912', '#', {
                        label: 'Blank_Code',
                      });
                      cy.createSpecificationIndicatorCode(indicator2Id, indCode2Data);
                    },
                  );
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

        // Restore Field 245 subfields to non-required
        if (subfieldAId) {
          cy.getSpecificationFieldSubfields(field245.id).then((resp) => {
            const subfieldA = findStandardSubfield(resp.body.subfields, 'a');
            if (subfieldA) {
              cy.updateSpecificationSubfield(subfieldAId, {
                ...subfieldA,
                required: false,
              });
            }
          });
        }

        if (subfieldLId) {
          cy.deleteSpecificationFieldSubfield(subfieldLId, false);
        }

        // Cleanup Local Field 981 (will cascade delete subfields and indicators)
        if (field981Id) {
          cy.deleteSpecificationField(field981Id, false);
        }
      });

      it(
        'C514912 Cannot create MARC bib record without required standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514912', 'nonParallel'] },
        () => {
          // Step 1: Open new MARC bib record editor
          InventoryInstance.newMarcBibRecord();

          // Step 2-3: Select valid LDR and 008 values
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );

          // Step 4: Add field 245 without required subfields
          QuickMarcEditor.updateExistingField(
            testData.tag245,
            testData.field245.contentWithoutRequired,
          );
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '2', 1);

          // Step 5: Add field 981 without required subfield
          QuickMarcEditor.addNewField(testData.tag981, testData.field981.contentWithoutRequired, 4);
          QuickMarcEditor.updateIndicatorValue(testData.tag981, '\\', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag981, '\\', 1);

          // Step 6: First save attempt - verify inline errors and callout
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(null, testData.expectedFailCount);
          QuickMarcEditor.closeAllCallouts();

          // Verify inline error messages for field 245
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag245,
            including(testData.expectedErrors.field245SubfieldA),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag245,
            including(testData.expectedErrors.field245SubfieldL),
          );

          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag981,
            including(testData.expectedErrors.field981SubfieldA),
          );

          // Verify Save button still enabled
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          // Step 7: Second save attempt - same errors
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(null, testData.expectedFailCount);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          // Step 8: Add empty required subfields to field 245
          QuickMarcEditor.updateExistingField(
            testData.tag245,
            testData.field245.contentWithEmptySubfields,
          );
          cy.wait(1000);

          // Step 9: Third save attempt - same errors (empty subfields still fail)
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(null, testData.expectedFailCount);
          QuickMarcEditor.closeAllCallouts();

          // Verify errors persist with empty subfields
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag245,
            including(testData.expectedErrors.field245SubfieldA),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag245,
            including(testData.expectedErrors.field245SubfieldL),
          );

          // Verify Save button still enabled (record not saved)
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
        },
      );
    });
  });
});
