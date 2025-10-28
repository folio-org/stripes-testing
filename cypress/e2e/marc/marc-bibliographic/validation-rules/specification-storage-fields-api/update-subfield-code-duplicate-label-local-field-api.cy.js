/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findLocalField,
  findLocalSubfield,
  generateTestFieldData,
  generateSubfieldData,
  validateApiResponse,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Update Subfield Code of Local Field with duplicate label API', () => {
  let user;
  let bibSpecId;
  let localField;
  let createdSubfield1;
  let createdSubfield2;

  const testCaseId = 'C511225';
  const LOCAL_FIELD_TAG = '903'; // Local field for testing - unique unused tag

  // Generate field payload using helper
  const localFieldPayload = generateTestFieldData(testCaseId, {
    tag: LOCAL_FIELD_TAG,
    label: 'Test_Local_Field',
    scope: 'local',
  });

  // Generate subfield payloads using helper
  const subfield1Payload = generateSubfieldData(testCaseId, 'a', {
    label: 'Subfield_name_1_test_duplicate_test',
  });

  const subfield2Payload = generateSubfieldData(testCaseId, 'b', {
    label: 'Test_subfield_2',
  });

  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
    Permissions.specificationStorageUpdateSpecificationSubfield.gui,
  ];

  before('Setup test data', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
    });

    getBibliographicSpec().then((bibSpec) => {
      bibSpecId = bibSpec.id;
    });
  });

  beforeEach('Setup user session and create test field with subfields', () => {
    cy.getUserToken(user.username, user.password);

    // Check if local field exists, create if it doesn't
    cy.getSpecificationFields(bibSpecId).then((response) => {
      validateApiResponse(response, 200);
      localField = findLocalField(response.body.fields, LOCAL_FIELD_TAG);

      const createSubfields = (fieldId) => {
        // Now create subfields for testing
        cy.getSpecificationFieldSubfields(fieldId).then((subfieldsResp) => {
          validateApiResponse(subfieldsResp, 200);

          // Remove existing subfields if they exist
          const existingSubfield1 = findLocalSubfield(
            subfieldsResp.body.subfields,
            subfield1Payload.code,
          );
          const existingSubfield2 = findLocalSubfield(
            subfieldsResp.body.subfields,
            subfield2Payload.code,
          );

          if (existingSubfield1) {
            cy.deleteSpecificationFieldSubfield(existingSubfield1.id);
          }
          if (existingSubfield2) {
            cy.deleteSpecificationFieldSubfield(existingSubfield2.id);
          }

          // Create first local subfield for testing
          cy.createSpecificationFieldSubfield(fieldId, subfield1Payload).then((createResp1) => {
            validateApiResponse(createResp1, 201);
            createdSubfield1 = createResp1.body;
            expect(createdSubfield1.code, 'Created subfield 1 has correct code').to.eq(
              subfield1Payload.code,
            );

            // Create second local subfield for testing
            cy.createSpecificationFieldSubfield(fieldId, subfield2Payload).then((createResp2) => {
              validateApiResponse(createResp2, 201);
              createdSubfield2 = createResp2.body;
              expect(createdSubfield2.code, 'Created subfield 2 has correct code').to.eq(
                subfield2Payload.code,
              );
            });
          });
        });
      };

      if (!localField) {
        // Create local field if it doesn't exist
        cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
          validateApiResponse(fieldResp, 201);
          localField = fieldResp.body;
          createSubfields(localField.id);
        });
      } else {
        createSubfields(localField.id);
      }
    });
  });

  after('Complete cleanup', () => {
    cy.getAdminToken();
    if (createdSubfield1?.id) {
      cy.deleteSpecificationFieldSubfield(createdSubfield1.id, false);
    }
    if (createdSubfield2?.id) {
      cy.deleteSpecificationFieldSubfield(createdSubfield2.id, false);
    }
    if (localField?.id && localField.scope === 'local') {
      // Only delete if it's a local field we created and it's safe to delete
      cy.deleteSpecificationField(localField.id, false);
    }
    Users.deleteViaApi(user.userId);
  });

  it(
    'C511225 Update Subfield Code of Local Field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C511225', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Update subfield with the same label as existing user-created subfield (should succeed)
      const updateWithDuplicateLabel = {
        code: 'x',
        label: subfield1Payload.label, // Same label as existing user-created subfield
        repeatable: subfield1Payload.repeatable,
        required: subfield1Payload.required,
        deprecated: subfield1Payload.deprecated,
      };

      cy.updateSpecificationSubfield(createdSubfield2.id, updateWithDuplicateLabel).then(
        (resp1) => {
          validateApiResponse(resp1, 202);
          expect(resp1.body.code, 'Step 1: Code updated successfully').to.eq('x');
          expect(resp1.body.label, 'Step 1: Label updated with duplicate label').to.eq(
            subfield1Payload.label,
          );
          expect(resp1.body.scope, 'Step 1: Scope remains local').to.eq('local');
        },
      );

      // Step 2: Verify the updated subfield code in the field's subfields collection
      cy.getSpecificationFieldSubfields(localField.id).then((finalResp) => {
        validateApiResponse(finalResp, 200);

        const updatedSubfield1 = findLocalSubfield(finalResp.body.subfields, subfield1Payload.code);
        const updatedSubfield2 = findLocalSubfield(finalResp.body.subfields, 'x');

        expect(updatedSubfield1, 'Step 2: Original subfield 1 still exists').to.exist;
        expect(updatedSubfield2, 'Step 2: Updated subfield 2 found in collection').to.exist;
        expect(updatedSubfield1.scope, 'Step 2: Subfield 1 scope is local').to.eq('local');
        expect(updatedSubfield2.scope, 'Step 2: Subfield 2 scope is local').to.eq('local');
        expect(updatedSubfield2.label, 'Step 2: Subfield 2 has duplicate label').to.eq(
          subfield1Payload.label,
        );
      });
    },
  );
});
