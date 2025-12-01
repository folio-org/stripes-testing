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
  toggleAllUndefinedValidationRules,
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
          content: '$a Create MARC bib wit required standard and appended $l Subfield codes',
        },
        field981: {
          indicators: ['\\', '\\'],
          content: '$a Has required Subfield code',
        },
        successMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
        userProperties: {},
      };

      let specId;
      let field245;
      let subfieldAId;
      let subfieldLId;
      let originalSubfieldARequired;
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
            toggleAllUndefinedValidationRules(specId, { enable: true });

            // Setup Field 245 subfields
            cy.getSpecificationFields(specId)
              .then((response) => {
                field245 = findSystemField(response.body.fields, testData.tag245);

                cy.getSpecificationFieldSubfields(field245.id).then((subfieldsResp) => {
                  const subfieldA = findStandardSubfield(subfieldsResp.body.subfields, 'a');
                  subfieldAId = subfieldA.id;
                  originalSubfieldARequired = subfieldA.required;

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
                    const subfieldLData = generateSubfieldData('C514947', 'l', {
                      label: 'Language_Appended',
                      required: true,
                      scope: 'local',
                    });
                    cy.createSpecificationFieldSubfield(field245.id, subfieldLData).then((resp) => {
                      subfieldLId = resp.body.id;
                    });
                  }
                });

                // Cleanup any existing field 981
                const field981 = findLocalField(response.body.fields, testData.tag981);
                if (field981) {
                  cy.deleteSpecificationField(field981.id, false);
                }
              })
              .then(() => {
                // Setup Local Field 981
                const field981Data = generateTestFieldData('C514947', {
                  tag: '981',
                  label: 'Local_Field_981',
                  scope: 'local',
                  repeatable: true,
                  required: false,
                });

                cy.createSpecificationField(specId, field981Data, false).then((fieldResp) => {
                  field981Id = fieldResp.body.id;

                  // Create required subfield 'a' for field 981
                  const subfieldAData = generateSubfieldData('C514947', 'a', {
                    label: 'Required_Subfield_A',
                    required: true,
                    scope: 'local',
                  });

                  cy.createSpecificationFieldSubfield(field981Id, subfieldAData);

                  // Create indicators for field 981
                  const indicator1Data = generateIndicatorData('C514947', 1, {
                    label: 'Indicator_1',
                  });
                  const indicator2Data = generateIndicatorData('C514947', 2, {
                    label: 'Indicator_2',
                  });

                  cy.createSpecificationFieldIndicator(field981Id, indicator1Data).then(
                    (ind1Resp) => {
                      indicator1Id = ind1Resp.body.id;

                      // Create blank indicator code for Ind1
                      const indCode1Data = generateIndicatorCodeData('C514947', '#', {
                        label: 'Blank_Code',
                      });
                      cy.createSpecificationIndicatorCode(indicator1Id, indCode1Data);
                    },
                  );

                  cy.createSpecificationFieldIndicator(field981Id, indicator2Data).then(
                    (ind2Resp) => {
                      indicator2Id = ind2Resp.body.id;

                      // Create blank indicator code for Ind2
                      const indCode2Data = generateIndicatorCodeData('C514947', '#', {
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

        // Restore Field 245 subfield 'a' to original required state
        if (subfieldAId) {
          cy.getSpecificationFieldSubfields(field245.id).then((resp) => {
            const subfieldA = findStandardSubfield(resp.body.subfields, 'a');
            if (subfieldA) {
              cy.updateSpecificationSubfield(subfieldAId, {
                ...subfieldA,
                required: originalSubfieldARequired,
              });
            }
          });
        }

        // Delete appended subfield 'l'
        if (subfieldLId) {
          cy.deleteSpecificationFieldSubfield(subfieldLId, false);
        }

        // Cleanup Local Field 981 (will cascade delete subfields and indicators)
        if (field981Id) {
          cy.deleteSpecificationField(field981Id, false);
        }

        toggleAllUndefinedValidationRules(specId, { enable: false });
      });

      it(
        'C514947 Create MARC bib record with required standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514947', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button in second pane >> Select "New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(/New .*MARC bib record/);

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 3: Select any values from the dropdowns of "008" field which are highlighted in red
          // Verify no dropdowns are highlighted in red (all required values are filled)
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );

          // Step 4: Add "245" field with required standard and appended Subfield codes
          QuickMarcEditor.updateExistingField(testData.tag245, testData.field245.content);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.field245.indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.field245.indicators[1], 1);

          // Verify field 245 has required subfields
          QuickMarcEditor.checkContentByTag(testData.tag245, testData.field245.content);

          // Step 5: Add "Local" field (981) with required local Subfield codes
          QuickMarcEditor.addNewField(testData.tag981, testData.field981.content, 4);
          QuickMarcEditor.updateIndicatorValue(testData.tag981, testData.field981.indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag981, testData.field981.indicators[1], 1);

          // Verify field 981 has required subfield
          QuickMarcEditor.checkContentByTag(testData.tag981, testData.field981.content);

          // Step 6: Click on the "Save & close" button
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

          // Verify instance title matches field 245 content
          InventoryInstance.checkInstanceTitle(
            'Create MARC bib wit required standard and appended',
          );
        },
      );
    });
  });
});
