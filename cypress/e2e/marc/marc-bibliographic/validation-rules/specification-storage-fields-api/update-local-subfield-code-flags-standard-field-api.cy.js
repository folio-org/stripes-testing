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

describe('MARC Bibliographic Validation Rules - Update Local Subfield Code of Standard Field flags API', () => {
  let user;
  let bibSpecId;
  let standardField;
  let createdSubfield;

  const testCaseId = 'C511217';
  const STANDARD_FIELD_TAG = '011'; // Linking ISSN - Standard Field (deprecated)

  // Generate subfield payload using helper
  const subfieldPayload = generateSubfieldData(testCaseId, 'r', {
    label: 'Test_subfield_r',
  });

  // Update payloads for different flag combinations
  const updatePayloads = {
    requiredRepeatableTrue: {
      code: '4',
      label: 'Required, repeatable - true test',
      required: true,
      repeatable: true,
      deprecated: false,
    },
    requiredRepeatableFalse: {
      code: '4',
      label: 'Required, repeatable - false test',
      required: false,
      repeatable: false,
      deprecated: true,
    },
    invalidRequired: {
      code: '4',
      label: 'Required misspell test',
      required: 'test', // Invalid - should be boolean
      repeatable: false,
      deprecated: true,
    },
    invalidRepeatable: {
      code: '4',
      label: 'Repeatable misspell test',
      required: true,
      repeatable: 'test', // Invalid - should be boolean
      deprecated: true,
    },
    invalidDeprecated: {
      code: '4',
      label: 'Deprecated misspell test',
      required: true,
      repeatable: true,
      deprecated: 'test', // Invalid - should be boolean
    },
  };

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

  beforeEach('Setup user session and create test subfield', () => {
    cy.getUserToken(user.username, user.password);

    // Get standard field 011
    cy.getSpecificationFields(bibSpecId).then((response) => {
      validateApiResponse(response, 200);
      standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
      expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

      // Remove existing subfield if it exists
      cy.getSpecificationFieldSubfields(standardField.id).then((subfieldsResp) => {
        validateApiResponse(subfieldsResp, 200);
        const existingSubfield = findLocalSubfield(
          subfieldsResp.body.subfields,
          subfieldPayload.code,
        );
        if (existingSubfield) {
          cy.deleteSpecificationFieldSubfield(existingSubfield.id);
        }

        // Create a local subfield for testing
        cy.createSpecificationFieldSubfield(standardField.id, subfieldPayload).then(
          (createResp) => {
            validateApiResponse(createResp, 201);
            createdSubfield = createResp.body;
            expect(createdSubfield.code, 'Created subfield has correct code').to.eq(
              subfieldPayload.code,
            );
          },
        );
      });
    });
  });

  after('Complete cleanup', () => {
    cy.getAdminToken();
    if (createdSubfield?.id) {
      cy.deleteSpecificationFieldSubfield(createdSubfield.id, false);
    }
    Users.deleteViaApi(user.userId);
  });

  it(
    'C511217 Update Local Subfield Code of Standard Field "required", "repeatable", "deprecated" flags for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C511217', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Update subfield with required=true, repeatable=true, deprecated=false (should succeed)
      cy.updateSpecificationSubfield(
        createdSubfield.id,
        updatePayloads.requiredRepeatableTrue,
      ).then((resp1) => {
        validateApiResponse(resp1, 202);
        expect(resp1.body.code, 'Step 1: Code updated successfully').to.eq('4');
        expect(resp1.body.label, 'Step 1: Label updated correctly').to.eq(
          updatePayloads.requiredRepeatableTrue.label,
        );
        expect(resp1.body.required, 'Step 1: Required flag is true').to.eq(true);
        expect(resp1.body.repeatable, 'Step 1: Repeatable flag is true').to.eq(true);
        expect(resp1.body.deprecated, 'Step 1: Deprecated flag is false').to.eq(false);
        expect(resp1.body.scope, 'Step 1: Scope remains local').to.eq('local');
      });

      // Step 2: Update subfield with required=false, repeatable=false, deprecated=true (should succeed)
      cy.updateSpecificationSubfield(
        createdSubfield.id,
        updatePayloads.requiredRepeatableFalse,
      ).then((resp2) => {
        validateApiResponse(resp2, 202);
        expect(resp2.body.code, 'Step 2: Code remains updated').to.eq('4');
        expect(resp2.body.label, 'Step 2: Label updated correctly').to.eq(
          updatePayloads.requiredRepeatableFalse.label,
        );
        expect(resp2.body.required, 'Step 2: Required flag is false').to.eq(false);
        expect(resp2.body.repeatable, 'Step 2: Repeatable flag is false').to.eq(false);
        expect(resp2.body.deprecated, 'Step 2: Deprecated flag is true').to.eq(true);
        expect(resp2.body.scope, 'Step 2: Scope remains local').to.eq('local');
      });

      // Step 3: Update subfield with invalid "required" field (should fail)
      cy.updateSpecificationSubfield(
        createdSubfield.id,
        updatePayloads.invalidRequired,
        false,
      ).then((resp3) => {
        validateApiResponse(resp3, 400);
        expect(resp3.body.errors, 'Step 3: Error message exists for invalid required').to.exist;
      });

      // Step 4: Update subfield with invalid "repeatable" field (should fail)
      cy.updateSpecificationSubfield(
        createdSubfield.id,
        updatePayloads.invalidRepeatable,
        false,
      ).then((resp4) => {
        validateApiResponse(resp4, 400);
        expect(resp4.body.errors, 'Step 4: Error message exists for invalid repeatable').to.exist;
      });

      // Step 5: Update subfield with invalid "deprecated" field (should fail)
      cy.updateSpecificationSubfield(
        createdSubfield.id,
        updatePayloads.invalidDeprecated,
        false,
      ).then((resp5) => {
        validateApiResponse(resp5, 400);
        expect(resp5.body.errors, 'Step 5: Error message exists for invalid deprecated').to.exist;
      });
    },
  );
});
