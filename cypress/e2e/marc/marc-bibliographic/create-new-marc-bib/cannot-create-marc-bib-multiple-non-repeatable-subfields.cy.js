import { including } from '@interactors/html';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findSystemField,
  validateApiResponse,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tags: {
          tag245: '245',
          tag986: '986',
        },
        fieldContents: {
          tag245WithDuplicates:
            '$a Create MARC bib $l with multiple not-repeatable $a standard and appended $l Subfield codes',
          tag986WithDuplicates: '$a Not repeatable subfield 1 $a not repeatable subfield 2',
          tag986EmptySecondSubfield: '$a Not repeatable subfield 1 $a',
          tag986WhitespaceSecondSubfield: '$a Not repeatable subfield 1 $a ',
          tag986SwitchedPositions: '$a $a Not repeatable subfield 1',
        },
        errorMessages: {
          subfieldANonRepeatable: "Fail: Subfield 'a' is non-repeatable.",
          subfieldLNonRepeatable: "Fail: Subfield 'l' is non-repeatable.",
        },
        indicators: {
          tag245FirstIndicator: '1',
          tag245SecondIndicator: '1',
        },
      };

      const requiredPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.specificationStorageGetSpecificationFields.gui,
        Permissions.specificationStorageCreateSpecificationField.gui,
        Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
        Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
      ];

      let user;
      let bibSpecId;
      let localField986Id;
      let field245SubfieldLId;

      before('Setup test data and validation rules', () => {
        cy.getAdminToken();
        cy.createTempUser(requiredPermissions).then((createdUser) => {
          user = createdUser;

          getBibliographicSpec().then((bibSpec) => {
            bibSpecId = bibSpec.id;

            cy.getSpecificationFields(bibSpecId).then((response) => {
              validateApiResponse(response, 200);

              // Find field 245 (standard or system)
              const field245 = findSystemField(response.body.fields, testData.tags.tag245);
              // eslint-disable-next-line no-unused-expressions
              expect(field245, 'Field 245 exists').to.exist;

              // Verify subfield 'a' exists and is non-repeatable (should be by default)
              cy.getSpecificationFieldSubfields(field245.id).then((subfieldsResp) => {
                validateApiResponse(subfieldsResp, 200);
                const subfieldA = subfieldsResp.body.subfields.find((sf) => sf.code === 'a');
                // eslint-disable-next-line no-console
                console.log(`Field 245 subfield 'a' repeatable status: ${subfieldA?.repeatable}`);
              });

              // Create non-repeatable appended subfield 'l' for field 245
              const subfieldLPayload = {
                code: 'l',
                label: 'AT_C514920_Subfield_l_not_repeatable',
                repeatable: false,
                required: false,
                deprecated: false,
                scope: 'local',
              };

              cy.createSpecificationFieldSubfield(field245.id, subfieldLPayload, false).then(
                (subfieldResp) => {
                  if (subfieldResp.status === 201) {
                    field245SubfieldLId = subfieldResp.body.id;
                  }
                },
              );
            });

            // Check if local field 986 exists and delete if present
            cy.deleteSpecificationFieldByTag(bibSpecId, testData.tags.tag986, false);

            // Create local field 986
            const field986Payload = {
              tag: testData.tags.tag986,
              label: 'AT_C514920_Local_Field_986',
              url: 'http://www.example.org/field986.html',
              repeatable: true,
              required: false,
              deprecated: false,
              scope: 'local',
            };

            cy.createSpecificationField(bibSpecId, field986Payload).then((fieldResp) => {
              validateApiResponse(fieldResp, 201);
              localField986Id = fieldResp.body.id;

              // Create non-repeatable subfield 'a' for field 986
              const subfieldAPayload = {
                code: 'a',
                label: 'AT_C514920_Subfield_a_not_repeatable',
                repeatable: false,
                required: false,
                deprecated: false,
                scope: 'local',
              };

              cy.createSpecificationFieldSubfield(localField986Id, subfieldAPayload).then(
                (subfieldResp) => {
                  validateApiResponse(subfieldResp, 201);
                  // Login after setup complete
                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                  });
                },
              );
            });
          });
        });
      });

      after('Delete user and cleanup validation rules', () => {
        cy.getAdminToken();

        // Cleanup validation rules
        if (field245SubfieldLId) {
          cy.deleteSpecificationFieldSubfield(field245SubfieldLId, false);
        }
        if (localField986Id) {
          cy.deleteSpecificationField(localField986Id, false);
        }

        // Delete user
        if (user) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C514920 Cannot create MARC bib record with multiple not-repeatable standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'C514920', 'spitfire', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button in second pane >> Select "New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.check008FieldContent();

          // Step 4: Add "245" field with multiple not-repeatable standard and appended Subfield codes
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            testData.fieldContents.tag245WithDuplicates,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.indicators.tag245FirstIndicator,
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.indicators.tag245SecondIndicator,
            1,
          );

          // Step 5: Add "Local" field by clicking on "+" icon with multiple not-repeatable Subfield codes
          MarcAuthority.addNewField(
            4,
            testData.tags.tag986,
            testData.fieldContents.tag986WithDuplicates,
          );
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag986, '\\', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag986, '\\', 1);

          // Step 6: Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag245,
            including(testData.errorMessages.subfieldANonRepeatable),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag245,
            including(testData.errorMessages.subfieldLNonRepeatable),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag986,
            including(testData.errorMessages.subfieldANonRepeatable),
          );
          QuickMarcEditor.verifyValidationCallout(0, 3);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          // Step 7: Click on the "Save & close" button again
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag245,
            including(testData.errorMessages.subfieldANonRepeatable),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag245,
            including(testData.errorMessages.subfieldLNonRepeatable),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag986,
            including(testData.errorMessages.subfieldANonRepeatable),
          );
          QuickMarcEditor.verifyValidationCallout(0, 3);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          // Step 8: Delete value from second not-repeatable subfield of Local field
          QuickMarcEditor.updateExistingField(
            testData.tags.tag986,
            testData.fieldContents.tag986EmptySecondSubfield,
          );

          // Step 9: Click on the "Save & close" button again
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag245,
            including(testData.errorMessages.subfieldANonRepeatable),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag245,
            including(testData.errorMessages.subfieldLNonRepeatable),
          );
          QuickMarcEditor.verifyValidationCallout(0, 2);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          // Step 10: Add a <whitespace> only in second not-repeatable subfield of Local field
          QuickMarcEditor.updateExistingField(
            testData.tags.tag986,
            testData.fieldContents.tag986WhitespaceSecondSubfield,
          );

          // Step 11: Click on the "Save & close" button again
          QuickMarcEditor.pressSaveAndCloseButton();

          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag245,
            including(testData.errorMessages.subfieldANonRepeatable),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag245,
            including(testData.errorMessages.subfieldLNonRepeatable),
          );
          QuickMarcEditor.verifyValidationCallout(0, 2);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          // Step 12: Switch places 1st and 2nd not-repeatable subfields in Local field
          QuickMarcEditor.updateExistingField(
            testData.tags.tag986,
            testData.fieldContents.tag986SwitchedPositions,
          );

          // Step 13: Click on the "Save & close" button again
          QuickMarcEditor.pressSaveAndCloseButton();

          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag245,
            including(testData.errorMessages.subfieldANonRepeatable),
          );
          QuickMarcEditor.checkErrorMessageForFieldByTag(
            testData.tags.tag245,
            including(testData.errorMessages.subfieldLNonRepeatable),
          );
          QuickMarcEditor.verifyValidationCallout(0, 2);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
        },
      );
    });
  });
});
