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
      const testCaseId = 'C514923';
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag245: '245',
        localFieldTag: '986',
        standardNonRepeatableSubfieldCode: 'a',
        appendedNonRepeatableSubfieldCode: 'l',
        localNonRepeatableSubfieldCode: 'a',
        field245ContentMultipleNonRepeatable: `$a AT_${testCaseId}_MarcBibInstance_${randomPostfix} $l with multiple not-repeatable $a standard and appended $l Subfield codes`,
        localFieldContentMultipleNonRepeatable:
          '$a Not repeatable subfield 1 $a not repeatable subfield 2',
        localFieldContentSecondEmpty: '$a Not repeatable subfield 1 $a',
        localFieldContentSecondWhitespace: '$a Not repeatable subfield 1 $a ',
        localFieldContentSwapped: '$a $a Not repeatable subfield 1',
        errorMessageSubfieldANonRepeatable: "Fail: Subfield 'a' is non-repeatable.",
        errorMessageSubfieldLNonRepeatable: "Fail: Subfield 'l' is non-repeatable.",
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

      let createdInstanceId;
      let user;
      let bibSpecId;
      let appendedSubfieldId;
      let localFieldId;

      before('Create test data', () => {
        cy.getAdminToken();

        getBibliographicSpec().then((bibSpec) => {
          bibSpecId = bibSpec.id;
          cy.syncSpecifications(bibSpecId);
          toggleAllUndefinedValidationRules(bibSpecId, { enable: false });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (user?.userId) Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        if (appendedSubfieldId) cy.deleteSpecificationFieldSubfield(appendedSubfieldId, false);
        if (localFieldId) cy.deleteSpecificationField(localFieldId, false);
        cy.syncSpecifications(bibSpecId);
      });

      it(
        'C514923 Cannot update MARC bib record with multiple not-repeatable standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514923'] },
        () => {
          cy.then(() => {
            // Create user and MARC bib FIRST (before setting up validation rules)
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );
            });
          })
            .then(() => {
              // NOW setup validation rules AFTER bib is created
              // Setup 245 standard field: create appended non-repeatable subfield 'l'
              cy.getSpecificationFields(bibSpecId).then((fieldsResp) => {
                const field245 = findSystemField(fieldsResp.body.fields, testData.tag245);

                // Create appended non-repeatable subfield 'l' for 245
                cy.createSpecificationFieldSubfield(field245.id, {
                  code: testData.appendedNonRepeatableSubfieldCode,
                  label: `AT_${testCaseId}_Appended_NonRepeatable_Subfield_${testData.appendedNonRepeatableSubfieldCode}_${randomPostfix}`,
                  repeatable: false,
                }).then((subfieldResp) => {
                  appendedSubfieldId = subfieldResp.body.id;
                });
              });

              // Setup local field 986: create field with non-repeatable subfield 'a'
              cy.deleteSpecificationFieldByTag(bibSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(bibSpecId, {
                tag: testData.localFieldTag,
                label: `AT_${testCaseId}_Local_Field_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localFieldId = fieldResp.body.id;

                // Create non-repeatable subfield 'a' for 986
                cy.createSpecificationFieldSubfield(localFieldId, {
                  code: testData.localNonRepeatableSubfieldCode,
                  label: `AT_${testCaseId}_Local_NonRepeatable_Subfield_${testData.localNonRepeatableSubfieldCode}_${randomPostfix}`,
                  repeatable: false,
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

              // Step 2: Update 245 field with multiple non-repeatable subfields
              QuickMarcEditor.updateExistingField(
                testData.tag245,
                testData.field245ContentMultipleNonRepeatable,
              );
              QuickMarcEditor.checkContentByTag(
                testData.tag245,
                testData.field245ContentMultipleNonRepeatable,
              );

              // Step 3: Add local field 986 with multiple non-repeatable subfields
              QuickMarcEditor.addEmptyFields(4);
              QuickMarcEditor.checkEmptyFieldAdded(5);
              QuickMarcEditor.addValuesToExistingField(
                4,
                testData.localFieldTag,
                testData.localFieldContentMultipleNonRepeatable,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.localFieldContentMultipleNonRepeatable,
              );

              function checkValidationErrors({ secondFieldError }) {
                QuickMarcEditor.verifyValidationCallout(0, secondFieldError ? 3 : 2);
                QuickMarcEditor.closeAllCallouts();
                [
                  testData.errorMessageSubfieldANonRepeatable,
                  testData.errorMessageSubfieldLNonRepeatable,
                ].forEach((errorMessage) => {
                  QuickMarcEditor.checkErrorMessageForFieldByTag(
                    testData.tag245,
                    including(errorMessage),
                  );
                });
                if (secondFieldError) {
                  QuickMarcEditor.checkErrorMessageForFieldByTag(
                    testData.localFieldTag,
                    including(testData.errorMessageSubfieldANonRepeatable),
                  );
                }
                QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
                QuickMarcEditor.verifySaveAndCloseButtonEnabled();
              }

              // Step 4: Click "Save & keep editing" - should show validation errors (3 fails)
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              checkValidationErrors({ secondFieldError: true });

              // Step 5: Click "Save & close" - should show same validation errors
              QuickMarcEditor.pressSaveAndCloseButton();
              checkValidationErrors({ secondFieldError: true });

              // Step 6: Delete value from second not-repeatable subfield of Local field
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.localFieldContentSecondEmpty,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.localFieldContentSecondEmpty,
              );

              // Step 7: Click "Save & close" - only 2 fails (local field error gone)
              QuickMarcEditor.pressSaveAndCloseButton();
              checkValidationErrors({ secondFieldError: false });

              // Step 8: Add a <whitespace> only in second not-repeatable subfield of Local field
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.localFieldContentSecondWhitespace,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.localFieldContentSecondWhitespace,
              );

              // Step 9: Click "Save & close" - still 2 fails (whitespace doesn't count)
              QuickMarcEditor.pressSaveAndCloseButton();
              checkValidationErrors({ secondFieldError: false });

              // Step 10: Switch places 1st and 2nd not-repeatable subfields in Local field
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.localFieldContentSwapped,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.localFieldContentSwapped,
              );

              // Step 11: Click "Save & close" - still 2 fails
              QuickMarcEditor.pressSaveAndCloseButton();
              checkValidationErrors({ secondFieldError: false });
            });
        },
      );
    });
  });
});
