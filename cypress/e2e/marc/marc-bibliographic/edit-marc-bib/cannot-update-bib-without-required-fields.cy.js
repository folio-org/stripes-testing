import Permissions from '../../../../support/dictionary/permissions';
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
  generateTestFieldData,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testCaseId = 'C514968';
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag245: '245',
        tag700: '700',
        tag980: '980',
        tag008: '008',
        field245OriginalContent: `$a AT_${testCaseId}_MarcBibInstance_${randomPostfix}`,
        field245UpdatedContent: `$a AT_${testCaseId}_MarcBibInstance_${randomPostfix} test`,
        requiredFieldErrors: ['Field 700 is required.', 'Field 980 is required.'],
        expectedFailCount: 2,
        expectedWarningCount: 0,
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: testData.field245OriginalContent,
          indicators: ['1', '1'],
        },
      ];

      let createdInstanceId;
      let user;
      let bibSpecId;
      let field700Id;
      let field980Id;

      before('Create test data', () => {
        cy.getAdminToken();

        getBibliographicSpec().then((bibSpec) => {
          bibSpecId = bibSpec.id;
          cy.syncSpecifications(bibSpecId);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (user?.userId) Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        // Restore field 700 to not required
        if (field700Id) {
          cy.getSpecificationFields(bibSpecId).then((resp) => {
            const field700 = findStandardField(resp.body.fields, testData.tag700);
            if (field700) {
              cy.updateSpecificationField(
                field700Id,
                {
                  ...field700,
                  required: false,
                },
                false,
              );
            }
          });
        }
        // Delete local field 980
        if (field980Id) {
          cy.deleteSpecificationField(field980Id, false);
        }
        cy.syncSpecifications(bibSpecId);
      });

      it(
        'C514968 Cannot update MARC bib record without required fields (Standard and Local) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514968'] },
        () => {
          cy.then(() => {
            // Create user and MARC bib FIRST (before setting up validation rules)
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;

              toggleAllUndefinedValidationRules(bibSpecId, { enable: false });

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );
            });
          })
            .then(() => {
              // NOW setup validation rules AFTER bib is created
              // Mark standard field 700 as required
              cy.getSpecificationFields(bibSpecId).then((response) => {
                const field700 = findStandardField(response.body.fields, testData.tag700);
                field700Id = field700.id;

                cy.updateSpecificationField(field700Id, {
                  ...field700,
                  required: true,
                });

                // Delete existing local field 980 if it exists
                const existingField980 = findLocalField(response.body.fields, testData.tag980);
                if (existingField980) {
                  cy.deleteSpecificationField(existingField980.id, false);
                }

                // Create required local field 980
                const field980Data = generateTestFieldData(testCaseId, {
                  tag: testData.tag980,
                  label: `AT_${testCaseId}_Required_Local_Field_${randomPostfix}`,
                  scope: 'local',
                  repeatable: false,
                  required: true,
                });

                cy.createSpecificationField(bibSpecId, field980Data, false).then((fieldResp) => {
                  field980Id = fieldResp.body.id;
                });
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            })
            .then(() => {
              // Step 1: Open the MARC bib record for editing
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Verify required fields 700 and 980 are not present
              QuickMarcEditor.checkTagAbsent(testData.tag700);
              QuickMarcEditor.checkTagAbsent(testData.tag980);

              // Step 3: Update field 245 (add "test" to the content)
              QuickMarcEditor.updateExistingField(testData.tag245, testData.field245UpdatedContent);
              QuickMarcEditor.checkContentByTag(testData.tag245, testData.field245UpdatedContent);

              function verifyValidationErrors() {
                testData.requiredFieldErrors.forEach((errorMessage) => {
                  QuickMarcEditor.checkCallout(errorMessage);
                });
                QuickMarcEditor.verifyValidationCallout(
                  testData.expectedWarningCount,
                  testData.expectedFailCount,
                );
                QuickMarcEditor.closeAllCallouts();
                QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
                QuickMarcEditor.verifySaveAndCloseButtonEnabled();
              }

              // Step 4: Click "Save & close" - should show validation errors
              QuickMarcEditor.pressSaveAndCloseButton();
              verifyValidationErrors();

              // Step 5: Click "Save & keep editing" - should show same validation errors
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              verifyValidationErrors();
            });
        },
      );
    });
  });
});
