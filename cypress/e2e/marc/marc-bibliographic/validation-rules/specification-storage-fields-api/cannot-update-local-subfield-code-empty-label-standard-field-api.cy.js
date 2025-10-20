/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  findStandardField,
  findLocalSubfield,
  validateApiResponse,
  generateSubfieldData,
  getBibliographicSpec,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot update Local Subfield Code of Standard Field with empty label API', () => {
  let user;
  let bibSpecId;
  let standardField;
  let createdSubfield;
  const STANDARD_FIELD_TAG = '011'; // Linking ISSN - Standard Field (deprecated)

  // Subfield payload declaration using helper
  const subfieldPayload = generateSubfieldData('C511220', 's', {
    label: 'Test subfield s',
  });

  // Update payloads for empty label validation
  const updatePayloads = {
    missingLabel: {
      code: '2',
      // label field intentionally omitted
      repeatable: true,
      required: false,
      deprecated: false,
    },
    emptyLabel: {
      code: '2',
      label: '',
      repeatable: true,
      required: false,
      deprecated: false,
    },
    whitespaceLabel: {
      code: '2',
      label: ' ',
      repeatable: true,
      required: false,
      deprecated: false,
    },
  };

  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
    Permissions.specificationStorageUpdateSpecificationSubfield.gui,
  ];

  // Test-specific helper function
  const validateLabelRequiredError = (response) => {
    expect(response.body.errors, 'Error array exists').to.exist;
    expect(response.body.errors.length, 'At least one error exists').to.be.greaterThan(0);
    const labelError = response.body.errors.find((error) => error.message.includes("The 'label' field is required"));
    expect(labelError, "Error message contains 'The 'label' field is required'").to.exist;
  };

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
    'C511220 Cannot update Local Subfield Code of Standard Field with empty "label" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C511220', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Update subfield without "label" field (should fail)
      cy.updateSpecificationSubfield(createdSubfield.id, updatePayloads.missingLabel, false).then(
        (resp1) => {
          validateApiResponse(resp1, 400);
          validateLabelRequiredError(resp1);
        },
      );

      // Step 2: Update subfield with empty "label" field (should fail)
      cy.updateSpecificationSubfield(createdSubfield.id, updatePayloads.emptyLabel, false).then(
        (resp2) => {
          validateApiResponse(resp2, 400);
          validateLabelRequiredError(resp2);
        },
      );

      // Step 3: Update subfield with whitespace-only "label" field (should fail)
      cy.updateSpecificationSubfield(
        createdSubfield.id,
        updatePayloads.whitespaceLabel,
        false,
      ).then((resp3) => {
        validateApiResponse(resp3, 400);
        validateLabelRequiredError(resp3);
      });
    },
  );
});
