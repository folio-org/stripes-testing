/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Standard Subfield Invalid Required Value API', () => {
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

  const STANDARD_FIELD_TAG = '011'; // standard field

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  function findStandardSubfield(subfields, code) {
    return subfields.find((sf) => sf.code === code && sf.scope === 'standard');
  }

  function validateApiResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
  }

  let user;
  let bibSpecId;
  let standardField;
  let standardSubfield;

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
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
    'C510696 Cannot update Standard Subfield with invalid value in "required" field for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C510696', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        validateApiResponse(response, 200);

        // Find standard field 245 (Title Statement)
        standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
        expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

        // Get subfields for the standard field
        cy.getSpecificationFieldSubfields(standardField.id).then((subfieldsResp) => {
          validateApiResponse(subfieldsResp, 200);
          expect(subfieldsResp.body.subfields).to.have.length.greaterThan(0);

          // Get the first standard subfield (typically 'a' - Title)
          standardSubfield = findStandardSubfield(subfieldsResp.body.subfields, 'a');
          expect(standardSubfield, 'Standard subfield "a" exists').to.exist;

          // Step 1: Update standard subfield with "required": true (should succeed)
          const updateToRequiredTrue = {
            code: standardSubfield.code,
            label: standardSubfield.label,
            repeatable: standardSubfield.repeatable,
            required: true,
            deprecated: standardSubfield.deprecated,
          };

          cy.updateSpecificationSubfield(standardSubfield.id, updateToRequiredTrue).then(
            (resp1) => {
              validateApiResponse(resp1, 202);
              expect(resp1.body.required, 'Step 1: Updated required to true').to.eq(true);
              expect(resp1.body.code, 'Step 1: Code unchanged').to.eq(standardSubfield.code);
              expect(resp1.body.label, 'Step 1: Label unchanged').to.eq(standardSubfield.label);
              expect(resp1.body.repeatable, 'Step 1: Repeatable unchanged').to.eq(
                standardSubfield.repeatable,
              );
              expect(resp1.body.deprecated, 'Step 1: Deprecated unchanged').to.eq(
                standardSubfield.deprecated,
              );
            },
          );

          // Step 2: GET to verify the subfield was updated with required: true
          cy.getSpecificationFieldSubfields(standardField.id).then((getResp1) => {
            validateApiResponse(getResp1, 200);
            const verifiedSubfield1 = findStandardSubfield(getResp1.body.subfields, 'a');
            expect(verifiedSubfield1, 'Step 2: Updated subfield exists').to.exist;
            expect(verifiedSubfield1.required, 'Step 2: Verified required is true').to.eq(true);
          });

          // Step 3: Update standard subfield with "required": false (should succeed)
          const updateToRequiredFalse = {
            code: standardSubfield.code,
            label: standardSubfield.label,
            repeatable: standardSubfield.repeatable,
            required: false,
            deprecated: standardSubfield.deprecated,
          };

          cy.updateSpecificationSubfield(standardSubfield.id, updateToRequiredFalse).then(
            (resp2) => {
              validateApiResponse(resp2, 202);
              expect(resp2.body.required, 'Step 3: Updated required to false').to.eq(false);
              expect(resp2.body.code, 'Step 3: Code unchanged').to.eq(standardSubfield.code);
              expect(resp2.body.label, 'Step 3: Label unchanged').to.eq(standardSubfield.label);
              expect(resp2.body.repeatable, 'Step 3: Repeatable unchanged').to.eq(
                standardSubfield.repeatable,
              );
              expect(resp2.body.deprecated, 'Step 3: Deprecated unchanged').to.eq(
                standardSubfield.deprecated,
              );
            },
          );

          // Step 4: GET to verify the subfield was updated with required: false
          cy.getSpecificationFieldSubfields(standardField.id).then((getResp2) => {
            validateApiResponse(getResp2, 200);
            const verifiedSubfield2 = findStandardSubfield(getResp2.body.subfields, 'a');
            expect(verifiedSubfield2, 'Step 4: Final updated subfield exists').to.exist;
            expect(verifiedSubfield2.required, 'Step 4: Verified required is false').to.eq(false);
          });

          // Step 5: Update standard subfield with invalid "required" value (should fail)
          const updateWithInvalidRequired = {
            code: standardSubfield.code,
            label: standardSubfield.label,
            repeatable: standardSubfield.repeatable,
            required: 'test', // Invalid value - should be boolean
            deprecated: standardSubfield.deprecated,
          };

          cy.updateSpecificationSubfield(
            standardSubfield.id,
            updateWithInvalidRequired,
            false,
          ).then((resp3) => {
            expect(resp3.status, 'Step 5: Update with invalid required value should fail').to.eq(
              400,
            );
            expect(resp3.body.errors).to.exist;
            expect(resp3.body.errors).to.have.length.greaterThan(0);

            // Verify error message contains JSON parse error information as specified in TestRail
            const errorMessage = resp3.body.errors[0].message;
            expect(errorMessage, 'Should contain JSON parse error message').to.contain(
              'JSON parse error',
            );
          });
        });
      });
    },
  );
});
