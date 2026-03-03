import { including } from '@interactors/html';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
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

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag245: '245',
        tag986: '986',
        field245Content:
          '$a Derive MARC bib $l with multiple not-repeatable $a standard and appended $l Subfield codes',
        field986: {
          indicators: ['\\', '\\'],
          content: '$a Not repeatable subfield 1 $a not repeatable subfield 2',
        },
        expectedErrors: {
          subfieldANonRepeatable: "Fail: Subfield 'a' is non-repeatable.",
          subfieldLNonRepeatable: "Fail: Subfield 'l' is non-repeatable.",
        },
        expectedFailCount: 3,
        expectedWarningCount: 0,
        userProperties: {},
        marcFile: {
          marc: 'C514921MarcBib.mrc',
          fileName: `C514921_${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };

      let specId;
      let field245;
      let field245SubfieldAId;
      let field245SubfieldAOriginalRepeatable;
      let field245SubfieldLId;
      let field245SubfieldLExisted;
      let field245SubfieldLOriginalRepeatable;
      let localField986Id;
      let createdInstanceId;

      before('Create user, import MARC file, and configure validation rules', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
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
                  field245SubfieldAId = subfieldA.id;
                  field245SubfieldAOriginalRepeatable = subfieldA.repeatable;

                  // Ensure standard subfield 'a' is non-repeatable
                  if (subfieldA.repeatable) {
                    cy.updateSpecificationSubfield(field245SubfieldAId, {
                      ...subfieldA,
                      repeatable: false,
                    });
                  }

                  // Check if appended subfield 'l' exists
                  const subfieldL = findLocalSubfield(subfieldsResp.body.subfields, 'l');
                  if (subfieldL) {
                    field245SubfieldLExisted = true;
                    field245SubfieldLId = subfieldL.id;
                    field245SubfieldLOriginalRepeatable = subfieldL.repeatable;

                    // Ensure it's non-repeatable
                    if (subfieldL.repeatable) {
                      cy.updateSpecificationSubfield(field245SubfieldLId, {
                        ...subfieldL,
                        repeatable: false,
                      });
                    }
                  } else {
                    // Create appended subfield 'l' as non-repeatable
                    field245SubfieldLExisted = false;
                    const subfieldLData = generateSubfieldData('C514921', 'l', {
                      label: 'Language_Appended',
                      repeatable: false,
                      required: false,
                      scope: 'local',
                    });
                    cy.createSpecificationFieldSubfield(field245.id, subfieldLData).then((resp) => {
                      field245SubfieldLId = resp.body.id;
                    });
                  }
                });

                // Check if local field 986 exists and delete if present
                const field986 = findLocalField(response.body.fields, testData.tag986);
                if (field986) {
                  cy.deleteSpecificationField(field986.id, false);
                }
              })
              .then(() => {
                // Setup Local Field 986
                const field986Data = generateTestFieldData('C514921', {
                  tag: '986',
                  label: 'Local_Field_986',
                  scope: 'local',
                  repeatable: true,
                  required: false,
                });

                cy.createSpecificationField(specId, field986Data, false).then((fieldResp) => {
                  localField986Id = fieldResp.body.id;

                  // Create non-repeatable subfield 'a' for field 986
                  const subfieldAData = generateSubfieldData('C514921', 'a', {
                    label: 'Subfield_a_not_repeatable',
                    repeatable: false,
                    required: false,
                    scope: 'local',
                  });

                  cy.createSpecificationFieldSubfield(localField986Id, subfieldAData);

                  // Create indicators for field 986
                  const indicator1Data = generateIndicatorData('C514921', 1, {
                    label: 'Indicator_1',
                  });
                  const indicator2Data = generateIndicatorData('C514921', 2, {
                    label: 'Indicator_2',
                  });

                  cy.createSpecificationFieldIndicator(localField986Id, indicator1Data).then(
                    (ind1Resp) => {
                      const indicator1Id = ind1Resp.body.id;

                      // Create blank indicator code for Ind1
                      const indCode1Data = generateIndicatorCodeData('C514921', '#', {
                        label: 'Blank_Code',
                      });
                      cy.createSpecificationIndicatorCode(indicator1Id, indCode1Data);
                    },
                  );

                  cy.createSpecificationFieldIndicator(localField986Id, indicator2Data).then(
                    (ind2Resp) => {
                      const indicator2Id = ind2Resp.body.id;

                      // Create blank indicator code for Ind2
                      const indCode2Data = generateIndicatorCodeData('C514921', '#', {
                        label: 'Blank_Code',
                      });
                      cy.createSpecificationIndicatorCode(indicator2Id, indCode2Data);
                    },
                  );
                });
              });
          });

          // Import MARC bib file
          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdInstanceId = record[testData.marcFile.propertyName].id;
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

        // Restore Field 245 subfield 'a' to original repeatable state
        if (field245SubfieldAId && field245SubfieldAOriginalRepeatable !== undefined) {
          cy.getSpecificationFieldSubfields(field245.id).then((resp) => {
            const subfieldA = findStandardSubfield(resp.body.subfields, 'a');
            if (subfieldA) {
              cy.updateSpecificationSubfield(field245SubfieldAId, {
                ...subfieldA,
                repeatable: field245SubfieldAOriginalRepeatable,
              });
            }
          });
        }

        // Handle Field 245 subfield 'l'
        if (field245SubfieldLId) {
          if (field245SubfieldLExisted) {
            // Restore original repeatable state
            if (field245SubfieldLOriginalRepeatable !== undefined) {
              cy.getSpecificationFieldSubfields(field245.id).then((resp) => {
                const subfieldL = findLocalSubfield(resp.body.subfields, 'l');
                if (subfieldL) {
                  cy.updateSpecificationSubfield(field245SubfieldLId, {
                    ...subfieldL,
                    repeatable: field245SubfieldLOriginalRepeatable,
                  });
                }
              });
            }
          } else {
            // Delete subfield 'l' as it didn't exist before test
            cy.deleteSpecificationFieldSubfield(field245SubfieldLId, false);
          }
        }

        // Cleanup Local Field 986 (will cascade delete subfields and indicators)
        if (localField986Id) {
          cy.deleteSpecificationField(localField986Id, false);
        }
      });

      it(
        'C514921 Cannot derive MARC bib record with multiple not-repeatable standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C514921', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button >> Select "Derive new MARC bibliographic record" option
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains(/Derive a new MARC bib record/);

          // Step 2: Make sure that "245" has multiple not repeatable standard and appended Subfield codes
          QuickMarcEditor.updateExistingField(testData.tag245, testData.field245Content);

          // Step 3: Add "Local" field 986 with multiple not repeatable Subfield codes
          QuickMarcEditor.addNewField(testData.tag986, testData.field986.content, 4);
          QuickMarcEditor.updateIndicatorValue(testData.tag986, testData.field986.indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag986, testData.field986.indicators[1], 1);

          // Step 4: Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndCloseButton();

          // Verify inline error messages for field 245
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag245,
            including(testData.expectedErrors.subfieldANonRepeatable),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag245,
            including(testData.expectedErrors.subfieldLNonRepeatable),
          );

          // Verify inline error messages for field 986
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag986,
            including(testData.expectedErrors.subfieldANonRepeatable),
          );

          // Verify validation callout
          QuickMarcEditor.verifyValidationCallout(
            testData.expectedWarningCount,
            testData.expectedFailCount,
          );
          QuickMarcEditor.closeAllCallouts();

          // Verify "Save & close" button remains enabled
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          // Step 5: Click on the "Save & close" button again
          QuickMarcEditor.pressSaveAndCloseButton();

          // Verify inline error messages persist for field 245
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag245,
            including(testData.expectedErrors.subfieldANonRepeatable),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag245,
            including(testData.expectedErrors.subfieldLNonRepeatable),
          );

          // Verify inline error messages persist for field 986
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag986,
            including(testData.expectedErrors.subfieldANonRepeatable),
          );

          // Verify validation callout appears again
          QuickMarcEditor.verifyValidationCallout(
            testData.expectedWarningCount,
            testData.expectedFailCount,
          );
          QuickMarcEditor.closeAllCallouts();

          // Verify "Save & close" button still enabled
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
        },
      );
    });
  });
});
