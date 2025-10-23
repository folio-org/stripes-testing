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

describe('MARC Bibliographic Validation Rules - Update Subfield Code Boolean Flags of Local Field API', () => {
  let user;
  let bibSpecId;
  let localField;
  let createdSubfield;

  const testCaseId = 'C511228';
  const LOCAL_FIELD_TAG = '904'; // Local field for testing - unique unused tag

  // Generate field payload using helper
  const localFieldPayload = generateTestFieldData(testCaseId, {
    tag: LOCAL_FIELD_TAG,
    label: 'Test_Local_Field',
    scope: 'local',
  });

  // Generate subfield payload using helper
  const subfieldPayload = generateSubfieldData(testCaseId, '4', {
    label: 'Test_subfield_flags',
    required: false,
    repeatable: false,
    deprecated: false,
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

  beforeEach('Setup user session and create test field with subfield', () => {
    cy.getUserToken(user.username, user.password);

    // Check if local field exists, create if it doesn't
    cy.getSpecificationFields(bibSpecId).then((response) => {
      validateApiResponse(response, 200);
      localField = findLocalField(response.body.fields, LOCAL_FIELD_TAG);

      const createSubfield = (fieldId) => {
        // Create subfield for testing
        cy.getSpecificationFieldSubfields(fieldId).then((subfieldsResp) => {
          validateApiResponse(subfieldsResp, 200);

          // Remove existing subfield if it exists
          const existingSubfield = findLocalSubfield(
            subfieldsResp.body.subfields,
            subfieldPayload.code,
          );

          if (existingSubfield) {
            cy.deleteSpecificationFieldSubfield(existingSubfield.id);
          }

          // Create local subfield for testing
          cy.createSpecificationFieldSubfield(fieldId, subfieldPayload).then((createResp) => {
            validateApiResponse(createResp, 201);
            createdSubfield = createResp.body;
            expect(createdSubfield.code, 'Created subfield has correct code').to.eq(
              subfieldPayload.code,
            );
          });
        });
      };

      if (!localField) {
        // Create local field if it doesn't exist
        cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
          validateApiResponse(fieldResp, 201);
          localField = fieldResp.body;
          createSubfield(localField.id);
        });
      } else {
        createSubfield(localField.id);
      }
    });
  });

  after('Complete cleanup', () => {
    cy.getAdminToken();
    if (createdSubfield?.id) {
      cy.deleteSpecificationFieldSubfield(createdSubfield.id, false);
    }
    if (localField?.id && localField.scope === 'local') {
      // Only delete if it's a local field we created and it's safe to delete
      cy.deleteSpecificationField(localField.id, false);
    }
    Users.deleteViaApi(user.userId);
  });

  it(
    'C511228 Update Subfield Code of Local field "required", "repeatable", "deprecated" flags for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C511228', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Update subfield with required=true, repeatable=true, deprecated=false
      const updateWithTrueFlags = {
        code: '4',
        label: 'Required, repeatable - true test',
        required: true,
        repeatable: true,
        deprecated: false,
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithTrueFlags).then((resp1) => {
        validateApiResponse(resp1, 202);
        expect(resp1.body.code, 'Step 1: Code remains correct').to.eq('4');
        expect(resp1.body.label, 'Step 1: Label updated').to.eq('Required, repeatable - true test');
        expect(resp1.body.required, 'Step 1: Required flag set to true').to.eq(true);
        expect(resp1.body.repeatable, 'Step 1: Repeatable flag set to true').to.eq(true);
        expect(resp1.body.deprecated, 'Step 1: Deprecated flag set to false').to.eq(false);
        expect(resp1.body.scope, 'Step 1: Scope remains local').to.eq('local');
      });

      // Step 2: Update subfield with required=false, repeatable=false, deprecated=true
      const updateWithFalseFlags = {
        code: '4',
        label: 'Required, repeatable - false test',
        required: false,
        repeatable: false,
        deprecated: true,
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithFalseFlags).then((resp2) => {
        validateApiResponse(resp2, 202);
        expect(resp2.body.code, 'Step 2: Code remains correct').to.eq('4');
        expect(resp2.body.label, 'Step 2: Label updated').to.eq(
          'Required, repeatable - false test',
        );
        expect(resp2.body.required, 'Step 2: Required flag set to false').to.eq(false);
        expect(resp2.body.repeatable, 'Step 2: Repeatable flag set to false').to.eq(false);
        expect(resp2.body.deprecated, 'Step 2: Deprecated flag set to true').to.eq(true);
        expect(resp2.body.scope, 'Step 2: Scope remains local').to.eq('local');
      });

      // Step 3: Try to update subfield with invalid "required" field (should fail with 400)
      const updateWithInvalidRequired = {
        code: '4',
        label: 'Required misspell test',
        required: 'test', // Invalid: should be boolean
        repeatable: false,
        deprecated: true,
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithInvalidRequired, false).then(
        (resp3) => {
          validateApiResponse(resp3, 400);
          expect(resp3.body, 'Step 3: Error response for invalid required field').to.have.property(
            'errors',
          );
        },
      );

      // Step 4: Try to update subfield with invalid "repeatable" field (should fail with 400)
      const updateWithInvalidRepeatable = {
        code: '4',
        label: 'Repeatable misspell test',
        required: true,
        repeatable: 'test', // Invalid: should be boolean
        deprecated: true,
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithInvalidRepeatable, false).then(
        (resp4) => {
          validateApiResponse(resp4, 400);
          expect(
            resp4.body,
            'Step 4: Error response for invalid repeatable field',
          ).to.have.property('errors');
        },
      );

      // Step 5: Try to update subfield with invalid "deprecated" field (should fail with 400)
      const updateWithInvalidDeprecated = {
        code: '4',
        label: 'Deprecated misspell test',
        required: true,
        repeatable: true,
        deprecated: 'test', // Invalid: should be boolean
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithInvalidDeprecated, false).then(
        (resp5) => {
          validateApiResponse(resp5, 400);
          expect(
            resp5.body,
            'Step 5: Error response for invalid deprecated field',
          ).to.have.property('errors');
        },
      );
    },
  );
});
