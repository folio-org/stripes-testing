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
  findStandardField,
  findLocalField,
  validateApiResponse,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        marcFile: {
          marc: 'marcBibFileForC552455.mrc',
          fileName: `C552455testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        tag245: '245',
        tag700: '700',
        tag948: '948',
        field245UpdatedValue: '$a C552455 Deane Waldo Malott papers, test $f 1894-1996.',
        expectedErrorMessage700: 'Field 700 is required.',
        expectedErrorMessage948: 'Fail: Field is non-repeatable.',
        expectedWarningMessage948: 'Warn: Field is undefined.',
      };

      let user;
      let bibSpecId;
      let field700Id;
      let field700InitialState;
      let field948Id;
      let field948InitialState;
      let createdInstanceId;
      let derivedInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C552455');
        getBibliographicSpec().then((bibSpec) => {
          bibSpecId = bibSpec.id;

          cy.getSpecificationFields(bibSpecId).then((fieldsResponse) => {
            const fields = fieldsResponse.body.fields;

            // Get field 700 and ensure it's required
            const field700 = findStandardField(fields, testData.tag700);
            if (field700) {
              field700Id = field700.id;
              field700InitialState = {
                tag: field700.tag,
                label: field700.label,
                url: field700.url,
                repeatable: field700.repeatable,
                required: field700.required,
                deprecated: field700.deprecated,
              };

              if (!field700.required) {
                cy.updateSpecificationField(field700Id, {
                  ...field700InitialState,
                  required: true,
                });
              }
            }

            // Check if field 948 exists and store its state
            const field948 = findLocalField(fields, testData.tag948);
            if (field948) {
              field948Id = field948.id;
              field948InitialState = {
                tag: field948.tag,
                label: field948.label,
                url: field948.url,
                repeatable: field948.repeatable,
                required: field948.required,
                deprecated: field948.deprecated,
                scope: field948.scope,
              };
            } else {
              // Create field 948 as non-repeatable local field
              cy.createSpecificationField(bibSpecId, {
                tag: testData.tag948,
                label: 'AT_C552455_Local Field',
                repeatable: false,
                required: false,
                deprecated: false,
                scope: 'local',
              }).then((response) => {
                field948Id = response.body.id;
                field948InitialState = null; // Indicates field was created for this test
              });
            }
          });
        });

        // Import MARC file
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdInstanceId = record[testData.marcFile.propertyName].id;
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.specificationStorageGetSpecificationFields.gui,
          Permissions.specificationStorageUpdateSpecificationField.gui,
          Permissions.specificationStorageDeleteSpecificationField.gui,
          Permissions.specificationStorageCreateSpecificationField.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();

        // Delete instances
        if (derivedInstanceId) {
          InventoryInstance.deleteInstanceViaApi(derivedInstanceId);
        }
        if (createdInstanceId) {
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        }

        // Restore or delete field 700
        if (field700Id && field700InitialState) {
          cy.updateSpecificationField(field700Id, field700InitialState, false);
        }

        // Restore or delete field 948
        if (field948InitialState) {
          // Restore to original state
          cy.updateSpecificationField(field948Id, field948InitialState, false);
        } else if (field948Id) {
          // Delete field created for test
          cy.deleteSpecificationField(field948Id, false);
        }

        Users.deleteViaApi(user.userId);
      });

      it(
        'C552455 Verify that derived MARC bib record is checked against the last version of MARC validation rules (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C552455', 'nonParallel'] },
        () => {
          // Step 1: Navigate to derive window
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains(/Derive a new MARC bib record/);

          // Step 2: Update 245 field (add "test" to $a subfield)
          QuickMarcEditor.updateExistingField(testData.tag245, testData.field245UpdatedValue);

          // Step 3: Click Save & close, verify validation errors
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.expectedErrorMessage700);

          // Verify all three 948 fields show non-repeatable error (rows 54, 55, 56)
          [55, 56].forEach((rowIndex) => {
            QuickMarcEditor.checkErrorMessageForField(rowIndex, testData.expectedErrorMessage948);
          });

          // Step 4: Send PUT request to update field 700 (set required=false)
          cy.getAdminToken();
          cy.updateSpecificationField(field700Id, {
            tag: testData.tag700,
            label: 'Added Entry - Personal Name',
            url: 'https://www.loc.gov/marc/bibliographic/bd700.html',
            repeatable: true,
            required: false,
            deprecated: false,
          }).then((response) => {
            validateApiResponse(response, 202);
            expect(response.body.required).to.eq(false);
          });

          // Step 5: Send DELETE request to delete field 948 validation rule
          cy.deleteSpecificationField(field948Id).then((response) => {
            validateApiResponse(response, 204);
          });

          cy.wait(5000); // Wait for API changes to propagate

          // Step 6: Click Save & close again, verify 948 shows warning (undefined field)
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();

          // Capture derived instance ID
          InventoryInstance.getId().then((id) => {
            derivedInstanceId = id;
          });
        },
      );
    });
  });
});
