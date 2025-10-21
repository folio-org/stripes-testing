/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findStandardField,
  findLocalSubfield,
  generateSubfieldData,
  validateApiResponse,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Update Local Subfield Code of Standard Field with duplicate label API', () => {
  let user;
  let bibSpecId;
  let standardField;
  let createdSubfield1;
  let createdSubfield2;

  const testCaseId = 'C511216';
  const STANDARD_FIELD_TAG = '011'; // Linking ISSN - Standard Field (deprecated)

  // Generate subfield payloads using helper
  const subfield1Payload = generateSubfieldData(testCaseId, 'm', {
    label: 'Subfield_name_1_test_duplicate_test',
  });

  const subfield2Payload = generateSubfieldData(testCaseId, 'n', {
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

  beforeEach('Setup user session and create test subfields', () => {
    cy.getUserToken(user.username, user.password);

    // Get standard field 011
    cy.getSpecificationFields(bibSpecId).then((response) => {
      validateApiResponse(response, 200);
      standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
      expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

      // Remove existing subfields if they exist
      cy.getSpecificationFieldSubfields(standardField.id).then((subfieldsResp) => {
        validateApiResponse(subfieldsResp, 200);

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
        cy.createSpecificationFieldSubfield(standardField.id, subfield1Payload).then(
          (createResp1) => {
            validateApiResponse(createResp1, 201);
            createdSubfield1 = createResp1.body;
            expect(createdSubfield1.code, 'Created subfield 1 has correct code').to.eq(
              subfield1Payload.code,
            );

            // Create second local subfield for testing
            cy.createSpecificationFieldSubfield(standardField.id, subfield2Payload).then(
              (createResp2) => {
                validateApiResponse(createResp2, 201);
                createdSubfield2 = createResp2.body;
                expect(createdSubfield2.code, 'Created subfield 2 has correct code').to.eq(
                  subfield2Payload.code,
                );
              },
            );
          },
        );
      });
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
    Users.deleteViaApi(user.userId);
  });

  it(
    'C511216 Update Local Subfield Code of Standard Field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C511216', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Update subfield with the same label as existing user-created subfield (should succeed)
      const updateWithDuplicateUserLabel = {
        code: 'x',
        label: subfield1Payload.label, // Same label as existing user-created subfield
        repeatable: subfield1Payload.repeatable,
        required: subfield1Payload.required,
        deprecated: subfield1Payload.deprecated,
      };

      cy.updateSpecificationSubfield(createdSubfield2.id, updateWithDuplicateUserLabel).then(
        (resp1) => {
          validateApiResponse(resp1, 202);
          expect(resp1.body.code, 'Step 1: Code updated successfully').to.eq('x');
          expect(resp1.body.label, 'Step 1: Label updated with duplicate user label').to.eq(
            subfield1Payload.label,
          );
          expect(resp1.body.scope, 'Step 1: Scope remains local').to.eq('local');
        },
      );

      // Step 2: Update subfield with the same label as existing LOC standard subfield (should succeed)
      // First, let's get the existing standard subfields to find a LOC-defined label
      cy.getSpecificationFieldSubfields(standardField.id).then((subfieldsResp) => {
        validateApiResponse(subfieldsResp, 200);

        // Find a standard subfield (LOC-defined) to use its label
        const standardSubfield = subfieldsResp.body.subfields.find(
          (subfield) => subfield.scope === 'standard',
        );

        if (standardSubfield) {
          const updateWithDuplicateStandardLabel = {
            code: 'z',
            label: standardSubfield.label, // Same label as existing LOC standard subfield
            repeatable: subfield1Payload.repeatable,
            required: subfield1Payload.required,
            deprecated: subfield1Payload.deprecated,
          };

          cy.updateSpecificationSubfield(
            createdSubfield1.id,
            updateWithDuplicateStandardLabel,
          ).then((resp2) => {
            validateApiResponse(resp2, 202);
            expect(resp2.body.code, 'Step 2: Code updated successfully').to.eq('z');
            expect(resp2.body.label, 'Step 2: Label updated with duplicate standard label').to.eq(
              standardSubfield.label,
            );
            expect(resp2.body.scope, 'Step 2: Scope remains local').to.eq('local');
          });
        } else {
          // Fallback: Use a known standard label like "Relator term" mentioned in test case
          const updateWithKnownStandardLabel = {
            code: 'z',
            label: 'Relator term',
            repeatable: subfield1Payload.repeatable,
            required: subfield1Payload.required,
            deprecated: subfield1Payload.deprecated,
          };

          cy.updateSpecificationSubfield(createdSubfield1.id, updateWithKnownStandardLabel).then(
            (resp2) => {
              validateApiResponse(resp2, 202);
              expect(resp2.body.code, 'Step 2: Code updated successfully').to.eq('z');
              expect(resp2.body.label, 'Step 2: Label updated with known standard label').to.eq(
                'Relator term',
              );
              expect(resp2.body.scope, 'Step 2: Scope remains local').to.eq('local');
            },
          );
        }
      });

      // Step 3: Verify the updated subfield codes in the field's subfields collection
      cy.getSpecificationFieldSubfields(standardField.id).then((finalResp) => {
        validateApiResponse(finalResp, 200);

        const updatedSubfield1 = findLocalSubfield(finalResp.body.subfields, 'z');
        const updatedSubfield2 = findLocalSubfield(finalResp.body.subfields, 'x');

        expect(updatedSubfield1, 'Step 3: Updated subfield 1 found in collection').to.exist;
        expect(updatedSubfield2, 'Step 3: Updated subfield 2 found in collection').to.exist;
        expect(updatedSubfield1.scope, 'Step 3: Subfield 1 scope is local').to.eq('local');
        expect(updatedSubfield2.scope, 'Step 3: Subfield 2 scope is local').to.eq('local');
      });
    },
  );
});
