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
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag245: '245',
        tag981: '981',
        field245: {
          contentWithoutRequired:
            '$b Derive MARC bib without required standard and appended Subfield codes',
          contentWithEmptySubfields: '$b Derive MARC bib $l $a',
        },
        field981: {
          indicators: ['\\', '\\'],
          contentWithoutRequired: '$b No required Subfield code',
        },
        expectedErrors: {
          field245SubfieldA: "Fail: Subfield 'a' is required.",
          field245SubfieldL: "Fail: Subfield 'l' is required.",
          field981SubfieldA: "Fail: Subfield 'a' is required.",
          field981SubfieldB: "Warn: Subfield 'b' is undefined.",
        },
        expectedWarningCount: 1,
        expectedFailCount: 3,
        userProperties: {},
        marcFile: {
          marc: 'C514913MarcBib.mrc',
          fileName: `C514913_${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };

      let specId;
      let field245;
      let subfieldAId;
      let subfieldLId;
      let field981Id;
      let createdInstanceId;
      let derivedInstanceId;

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
            toggleAllUndefinedValidationRules(specId, { enable: true });

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
                    const subfieldLData = generateSubfieldData('C514913', 'l', {
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
                const field981Data = generateTestFieldData('C514913', {
                  tag: '981',
                  label: 'Local_Field_981',
                  scope: 'local',
                  repeatable: true,
                  required: false,
                });

                cy.createSpecificationField(specId, field981Data, false).then((fieldResp) => {
                  field981Id = fieldResp.body.id;

                  // Create required subfield 'a' for field 981
                  const subfieldAData = generateSubfieldData('C514913', 'a', {
                    label: 'Required_Subfield_A',
                    required: true,
                    scope: 'local',
                  });

                  cy.createSpecificationFieldSubfield(field981Id, subfieldAData);

                  // Note: Subfield 'b' intentionally not created - will be undefined

                  // Create indicators for field 981
                  const indicator1Data = generateIndicatorData('C514913', 1, {
                    label: 'Indicator_1',
                  });
                  const indicator2Data = generateIndicatorData('C514913', 2, {
                    label: 'Indicator_2',
                  });

                  cy.createSpecificationFieldIndicator(field981Id, indicator1Data).then(
                    (ind1Resp) => {
                      const indicator1Id = ind1Resp.body.id;

                      // Create blank indicator code for Ind1
                      const indCode1Data = generateIndicatorCodeData('C514913', '#', {
                        label: 'Blank_Code',
                      });
                      cy.createSpecificationIndicatorCode(indicator1Id, indCode1Data);
                    },
                  );

                  cy.createSpecificationFieldIndicator(field981Id, indicator2Data).then(
                    (ind2Resp) => {
                      const indicator2Id = ind2Resp.body.id;

                      // Create blank indicator code for Ind2
                      const indCode2Data = generateIndicatorCodeData('C514913', '#', {
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

        if (derivedInstanceId) {
          InventoryInstance.deleteInstanceViaApi(derivedInstanceId);
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

        toggleAllUndefinedValidationRules(specId, { enable: false });
      });

      it(
        'C514913 Cannot derive MARC bib record without required standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514913', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button >> Select "Derive new MARC bibliographic record" option
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(/Derive a new MARC bib record/);

          // Step 2: Make sure that "245" has no required standard and appended Subfield codes
          QuickMarcEditor.updateExistingField(
            testData.tag245,
            testData.field245.contentWithoutRequired,
          );

          // Step 3: Add "Local" field 981 with no required local Subfield codes
          QuickMarcEditor.addNewField(testData.tag981, testData.field981.contentWithoutRequired, 4);
          QuickMarcEditor.updateIndicatorValue(testData.tag981, '\\', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag981, '\\', 1);
          // Step 4: Click on the "Save & close" button - First save attempt
          QuickMarcEditor.pressSaveAndCloseButton();

          QuickMarcEditor.verifyValidationCallout(
            testData.expectedWarningCount,
            testData.expectedFailCount,
          );
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

          // Verify inline error messages for field 981
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag981,
            including(testData.expectedErrors.field981SubfieldB),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag981,
            including(testData.expectedErrors.field981SubfieldA),
          );

          // Step 5: Click on the "Save & close" button again - Second save attempt
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(
            testData.expectedWarningCount,
            testData.expectedFailCount,
          );
          QuickMarcEditor.closeAllCallouts();

          // Verify inline error messages persist
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag245,
            including(testData.expectedErrors.field245SubfieldA),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag245,
            including(testData.expectedErrors.field245SubfieldL),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag981,
            including(testData.expectedErrors.field981SubfieldB),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag981,
            including(testData.expectedErrors.field981SubfieldA),
          );

          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          // Step 6: Add empty required subfields to "245" field
          QuickMarcEditor.updateExistingField(
            testData.tag245,
            testData.field245.contentWithEmptySubfields,
          );
          cy.wait(1000);

          // Step 7: Click on the "Save & close" button again - Third save attempt with empty subfields
          QuickMarcEditor.pressSaveAndCloseButton();

          // Verify same validation errors (empty subfields still fail)
          QuickMarcEditor.verifyValidationCallout(
            testData.expectedWarningCount,
            testData.expectedFailCount,
          );
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
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag981,
            including(testData.expectedErrors.field981SubfieldB),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tag981,
            including(testData.expectedErrors.field981SubfieldA),
          );

          // Verify Save button still enabled (record not saved)
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
        },
      );
    });
  });
});
