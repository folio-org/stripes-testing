import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findLocalField,
  generateTestFieldData,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testCaseId = 'C552357';
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag008: '008',
        tag245: '245',
        tag980: '980',
        field980Content1: '$a First not-repeatable field',
        field980Content2: '$a Second not-repeatable field',
        errorMessageFieldNonRepeatable: 'Fail: Field is non-repeatable.',
        expectedFailCount: 1,
        expectedWarningCount: 0,
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: `$a AT_${testCaseId}_MarcBibInstance_${randomPostfix}`,
          indicators: ['1', '1'],
        },
      ];

      let specId;
      let createdInstanceId;
      let user;
      let field980Id;

      before('Sync specification storage and get bibSpecId', () => {
        cy.getAdminToken();
        getBibliographicSpec().then((bibSpec) => {
          specId = bibSpec.id;
          cy.syncSpecifications(specId);
        });
      });

      after('Delete user, instance and restore validation rules', () => {
        cy.getAdminToken();
        if (user?.userId) Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        // Delete local field 980
        if (field980Id) cy.deleteSpecificationField(field980Id, false);
        cy.syncSpecifications(specId);
      });

      it(
        'C552357 Cannot update MARC bib record with multiple not-repeatable "Local" fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C552357', 'nonParallel'] },
        () => {
          cy.then(() => {
            // Create user and MARC bib FIRST (before setting up validation rules)
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;

              toggleAllUndefinedValidationRules(specId, { enable: false });

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceIdValue) => {
                  createdInstanceId = instanceIdValue;
                },
              );
            });
          })
            .then(() => {
              // NOW setup validation rules AFTER bib is created
              cy.getSpecificationFields(specId).then((response) => {
                // Delete existing local field 980 if it exists
                const existingField980 = findLocalField(response.body.fields, testData.tag980);
                if (existingField980) {
                  cy.deleteSpecificationField(existingField980.id, false);
                }

                // Create local field 980 as not repeatable
                const field980Data = generateTestFieldData(testCaseId, {
                  tag: testData.tag980,
                  label: `Not_Repeatable_Local_Field_${randomPostfix}`,
                  scope: 'local',
                  repeatable: false,
                  required: false,
                });

                cy.createSpecificationField(specId, field980Data, false).then((fieldResp) => {
                  field980Id = fieldResp.body.id;
                });
              });
            })
            .then(() => {
              // Login and navigate to inventory
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            })
            .then(() => {
              // Step 1: Navigate to the created instance and open edit MARC bib
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();

              // Click Actions → Edit MARC bibliographic record
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Add multiple not-repeatable Local fields (field 980)
              // Add first 980 field
              QuickMarcEditor.addNewField(testData.tag980, testData.field980Content1, 4);
              QuickMarcEditor.verifyTagValue(5, testData.tag980);
              QuickMarcEditor.checkContent(testData.field980Content1, 5);

              // Add second 980 field (should trigger validation error)
              QuickMarcEditor.addNewField(testData.tag980, testData.field980Content2, 5);
              QuickMarcEditor.verifyTagValue(6, testData.tag980);
              QuickMarcEditor.checkContent(testData.field980Content2, 6);

              // Helper function to verify validation errors
              const verifyValidationErrors = () => {
                // Verify error callout
                QuickMarcEditor.verifyValidationCallout(
                  testData.expectedWarningCount,
                  testData.expectedFailCount,
                );
                QuickMarcEditor.closeAllCallouts();

                // Verify inline error message after second 980 field
                QuickMarcEditor.checkErrorMessageForField(
                  6,
                  testData.errorMessageFieldNonRepeatable,
                );

                // Verify buttons are still enabled
                QuickMarcEditor.checkButtonsEnabled();
              };

              // Step 3: Click "Save & close" - should show validation errors
              QuickMarcEditor.pressSaveAndCloseButton();
              verifyValidationErrors();

              // Step 4: Click "Save & keep editing" - should show same validation errors
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              verifyValidationErrors();
            });
        },
      );
    });
  });
});
