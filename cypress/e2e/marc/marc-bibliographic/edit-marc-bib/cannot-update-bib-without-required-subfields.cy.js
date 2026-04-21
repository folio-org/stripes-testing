import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  getBibliographicSpec,
  findSystemField,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import { including } from '../../../../../interactors';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testCaseId = 'C514914';
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag245: '245',
        localFieldTag: '981',
        standardRequiredSubfieldCode: 'a',
        appendedRequiredSubfieldCode: 'l',
        localRequiredSubfieldCode: 'a',
        localUndefinedSubfieldCode: 'b',
        local1stIndicatorCode: '1',
        local2ndIndicatorCode: '0',
        field245Content: `$a AT_${testCaseId}_MarcBibInstance_${randomPostfix} $l which has standard and appended Indicator, Subfield codes`,
        field245ContentWithoutRequired:
          '$b Edit MARC bib without required standard and appended Subfield codes',
        field245ContentWithEmptyRequired:
          '$l $a   $b Edit MARC bib without required standard and appended Subfield codes',
        localFieldContentWithoutRequired: '$b No required Subfield code',
        validationCallout3Fails1Warn: 'Record cannot be saved. Please check the record for errors.',
        errorMessageSubfieldARequired: "Fail: Subfield 'a' is required.",
        errorMessageSubfieldLRequired: "Fail: Subfield 'l' is required.",
        warningMessageSubfieldBUndefined: "Warn: Subfield 'b' is undefined.",
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: `$a AT_${testCaseId}_MarcBibInstance_${randomPostfix}`,
          indicators: ['1', '2'],
        },
      ];

      let createdInstanceId;
      let user;
      let bibSpecId;
      let appendedSubfieldId;
      let localFieldId;
      let standardSubfieldAId;
      let field245Id;

      before('Create test data', () => {
        cy.getAdminToken();

        getBibliographicSpec().then((bibSpec) => {
          bibSpecId = bibSpec.id;
          cy.syncSpecifications(bibSpecId);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        toggleAllUndefinedValidationRules(bibSpecId, { enable: false });
        if (user?.userId) Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        if (appendedSubfieldId) cy.deleteSpecificationFieldSubfield(appendedSubfieldId, false);
        if (localFieldId) cy.deleteSpecificationField(localFieldId, false);
        // Restore standard subfield 'a' to not required
        if (standardSubfieldAId && field245Id) {
          cy.getSpecificationFieldSubfields(field245Id).then((response) => {
            const subfieldA = response.body.subfields.find((sf) => sf.id === standardSubfieldAId);
            if (subfieldA) {
              cy.updateSpecificationSubfield(
                standardSubfieldAId,
                {
                  ...subfieldA,
                  required: false,
                },
                false,
              );
            }
          });
        }
        cy.syncSpecifications(bibSpecId);
      });

      it(
        'C514914 Cannot update MARC bib record without required standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514914'] },
        () => {
          cy.then(() => {
            toggleAllUndefinedValidationRules(bibSpecId, { enable: false });
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdInstanceId = instanceId;
              },
            );
          })
            .then(() => {
              // Setup 245 standard field: mark standard subfield 'a' as required + create appended required subfield 'l'
              cy.getSpecificationFields(bibSpecId).then((fieldsResp) => {
                const field245 = findSystemField(fieldsResp.body.fields, testData.tag245);
                field245Id = field245.id;

                // Get existing subfields and mark 'a' as required
                cy.getSpecificationFieldSubfields(field245.id).then((subfieldsResp) => {
                  const subfieldA = subfieldsResp.body.subfields.find(
                    (sf) => sf.code === testData.standardRequiredSubfieldCode && sf.scope === 'standard',
                  );
                  if (subfieldA) {
                    standardSubfieldAId = subfieldA.id;
                    cy.updateSpecificationSubfield(subfieldA.id, {
                      ...subfieldA,
                      required: true,
                    });
                  }
                });

                // Create appended required subfield 'l' for 245
                cy.createSpecificationFieldSubfield(field245.id, {
                  code: testData.appendedRequiredSubfieldCode,
                  label: `AT_${testCaseId}_Appended_Required_Subfield_${testData.appendedRequiredSubfieldCode}_${randomPostfix}`,
                  repeatable: false,
                  required: true,
                }).then((subfieldResp) => {
                  appendedSubfieldId = subfieldResp.body.id;
                });
              });

              // Setup local field 981: create field with required subfield 'a' and indicator codes
              cy.deleteSpecificationFieldByTag(bibSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(bibSpecId, {
                tag: testData.localFieldTag,
                label: `AT_${testCaseId}_Local_Field_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localFieldId = fieldResp.body.id;

                // Create indicator 1 with code '\'
                cy.createSpecificationFieldIndicator(localFieldId, {
                  order: 1,
                  label: `AT_${testCaseId}_Local_Indicator_1_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.local1stIndicatorCode,
                    label: `AT_${testCaseId}_Local_Indicator_Code_1_${randomPostfix}`,
                  });
                });

                // Create indicator 2 with code '\'
                cy.createSpecificationFieldIndicator(localFieldId, {
                  order: 2,
                  label: `AT_${testCaseId}_Local_Indicator_2_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.local2ndIndicatorCode,
                    label: `AT_${testCaseId}_Local_Indicator_Code_2_${randomPostfix}`,
                  });
                });

                // Create required subfield 'a' for 981
                cy.createSpecificationFieldSubfield(localFieldId, {
                  code: testData.localRequiredSubfieldCode,
                  label: `AT_${testCaseId}_Local_Required_Subfield_${testData.localRequiredSubfieldCode}_${randomPostfix}`,
                  repeatable: false,
                  required: true,
                });
              });
            })
            .then(() => {
              cy.createTempUser([
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]).then((userProperties) => {
                user = userProperties;

                toggleAllUndefinedValidationRules(bibSpecId, { enable: true });

                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              });
            })
            .then(() => {
              // Step 1: Open the MARC bib record for editing
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Update 245 field to remove required subfields (only keep $b)
              QuickMarcEditor.updateExistingField(
                testData.tag245,
                testData.field245ContentWithoutRequired,
              );

              // Step 3: Add local field 981 with only $b (no required $a)
              QuickMarcEditor.addEmptyFields(4);
              QuickMarcEditor.checkEmptyFieldAdded(5);
              QuickMarcEditor.addValuesToExistingField(
                4,
                testData.localFieldTag,
                testData.localFieldContentWithoutRequired,
                testData.local1stIndicatorCode,
                testData.local2ndIndicatorCode,
              );

              // Step 4: Click "Save & keep editing" - should show validation errors
              function checkValidation() {
                QuickMarcEditor.verifyValidationCallout(1, 3);
                QuickMarcEditor.closeAllCallouts();
                [
                  testData.errorMessageSubfieldARequired,
                  testData.errorMessageSubfieldLRequired,
                ].forEach((errorMessage) => {
                  QuickMarcEditor.checkErrorMessageForFieldByTag(
                    testData.tag245,
                    including(errorMessage),
                  );
                });
                QuickMarcEditor.checkErrorMessageForFieldByTag(
                  testData.localFieldTag,
                  including(testData.errorMessageSubfieldARequired),
                );
                QuickMarcEditor.checkWarningMessageForFieldByTag(
                  testData.localFieldTag,
                  including(testData.warningMessageSubfieldBUndefined),
                );
                QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
                QuickMarcEditor.verifySaveAndCloseButtonEnabled();
              }

              QuickMarcEditor.clickSaveAndKeepEditingButton();
              checkValidation();

              // Step 5: Click "Save & close" - should show same validation errors
              QuickMarcEditor.pressSaveAndCloseButton();
              checkValidation();

              // Step 7: Click "Save & close" again - should still show validation errors
              QuickMarcEditor.pressSaveAndCloseButton();
              checkValidation();
            });
        },
      );
    });
  });
});
