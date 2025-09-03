/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Update Standard Field Subfields API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageUpdateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
    Permissions.specificationStorageUpdateSpecificationSubfield.gui,
  ];

  const STANDARD_FIELD_TAG = '100';

  let user;
  let authoritySpecId;
  let standardField;
  let standardSubfield;

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  function findStandardSubfield(subfields, code) {
    return subfields.find((sf) => sf.code === code && sf.scope === 'standard');
  }

  function validateApiResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
  }

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        // Find the specification with profile 'authority'
        const authoritySpec = specs.find((s) => s.profile === 'authority');
        expect(authoritySpec, 'MARC authority specification exists').to.exist;
        authoritySpecId = authoritySpec.id;
      });
    });
  });

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C511229 Cannot update Subfield of Standard Field with invalid value in "required" for MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C511229', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((response) => {
        validateApiResponse(response, 200);

        // Find a standard field (e.g., 100)
        standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
        expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

        // Get subfields for the standard field
        cy.getSpecificationFieldSubfields(standardField.id).then((subfieldsResp) => {
          validateApiResponse(subfieldsResp, 200);
          expect(subfieldsResp.body.subfields).to.have.length.greaterThan(0);

          // Get the first standard subfield (typically 'a')
          standardSubfield = findStandardSubfield(subfieldsResp.body.subfields, 'a');
          expect(standardSubfield, 'Standard subfield "a" exists').to.exist;

          // Step 1: Update standard subfield with "required": true
          const updatePayloadTrue = {
            code: standardSubfield.code,
            label: standardSubfield.label,
            repeatable: standardSubfield.repeatable,
            required: true,
            deprecated: standardSubfield.deprecated,
          };

          cy.updateSpecificationSubfield(standardSubfield.id, updatePayloadTrue, true).then(
            (updateResp) => {
              validateApiResponse(updateResp, 202);
              expect(updateResp.body.required, 'Step 1: Updated required to true').to.eq(true);
              expect(updateResp.body.code, 'Code unchanged').to.eq(standardSubfield.code);
              expect(updateResp.body.label, 'Label unchanged').to.eq(standardSubfield.label);
              expect(updateResp.body.repeatable, 'Repeatable unchanged').to.eq(
                standardSubfield.repeatable,
              );
              expect(updateResp.body.deprecated, 'Deprecated unchanged').to.eq(
                standardSubfield.deprecated,
              );
            },
          );

          // Step 2: Verify the subfield was updated via GET request
          cy.getSpecificationFieldSubfields(standardField.id).then((verifyResp1) => {
            validateApiResponse(verifyResp1, 200);

            const updatedSubfield1 = findStandardSubfield(verifyResp1.body.subfields, 'a');
            expect(updatedSubfield1, 'Updated subfield exists').to.exist;
            expect(updatedSubfield1.required, 'Step 2: Verified required is true').to.eq(true);
          });

          // Step 3: Update standard subfield with "required": false
          const updatePayloadFalse = {
            code: standardSubfield.code,
            label: standardSubfield.label,
            repeatable: standardSubfield.repeatable,
            required: false,
            deprecated: standardSubfield.deprecated,
          };

          cy.updateSpecificationSubfield(standardSubfield.id, updatePayloadFalse, true).then(
            (updateResp2) => {
              validateApiResponse(updateResp2, 202);
              expect(updateResp2.body.required, 'Step 3: Updated required to false').to.eq(false);
              expect(updateResp2.body.code, 'Code unchanged').to.eq(standardSubfield.code);
              expect(updateResp2.body.label, 'Label unchanged').to.eq(standardSubfield.label);
              expect(updateResp2.body.repeatable, 'Repeatable unchanged').to.eq(
                standardSubfield.repeatable,
              );
              expect(updateResp2.body.deprecated, 'Deprecated unchanged').to.eq(
                standardSubfield.deprecated,
              );
            },
          );

          // Step 4: Verify the final subfield state via GET request
          cy.getSpecificationFieldSubfields(standardField.id).then((verifyResp2) => {
            validateApiResponse(verifyResp2, 200);

            const updatedSubfield2 = findStandardSubfield(verifyResp2.body.subfields, 'a');
            expect(updatedSubfield2, 'Final updated subfield exists').to.exist;
            expect(updatedSubfield2.required, 'Step 4: Verified required is false').to.eq(false);
          });
        });
      });
    },
  );
});
