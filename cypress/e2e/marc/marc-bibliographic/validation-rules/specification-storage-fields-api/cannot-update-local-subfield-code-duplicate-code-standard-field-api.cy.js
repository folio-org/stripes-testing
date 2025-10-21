/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot update Local Subfield Code with duplicate code for Standard field API', () => {
  let user;
  let bibSpecId;
  let standardField;
  let createdSubfield1;
  let createdSubfield2;
  const STANDARD_FIELD_TAG = '011'; // Linking ISSN - Standard Field (deprecated)

  // Subfield payload declarations
  const subfieldPayload1 = {
    code: 'm',
    label: 'AT_C511213_Test subfield m',
    repeatable: true,
    required: false,
    deprecated: false,
  };

  const subfieldPayload2 = {
    code: 'p',
    label: 'AT_C511213_Test subfield p',
    repeatable: true,
    required: false,
    deprecated: false,
  };

  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
    Permissions.specificationStorageUpdateSpecificationSubfield.gui,
  ];

  // Helper functions
  const findStandardField = (fields, tag) => {
    return fields.find((field) => field.tag === tag && field.scope === 'standard');
  };

  const findLocalSubfield = (subfields, code) => {
    return subfields.find((subfield) => subfield.code === code && subfield.scope === 'local');
  };

  const findStandardSubfield = (subfields, code) => {
    return subfields.find((subfield) => subfield.code === code && subfield.scope === 'standard');
  };

  const validateApiResponse = (response, expectedStatus) => {
    expect(response.status, `Response status should be ${expectedStatus}`).to.eq(expectedStatus);
  };

  before('Setup test data', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
    });

    cy.getSpecificationIds().then((specs) => {
      const bibSpec = specs.find((s) => s.profile === 'bibliographic');
      expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
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

      // Clean up any existing test subfields
      cy.getSpecificationFieldSubfields(standardField.id).then((subfieldsResp) => {
        validateApiResponse(subfieldsResp, 200);

        // Remove existing subfields if they exist
        const existingSubfield1 = findLocalSubfield(
          subfieldsResp.body.subfields,
          subfieldPayload1.code,
        );
        const existingSubfield2 = findLocalSubfield(
          subfieldsResp.body.subfields,
          subfieldPayload2.code,
        );

        if (existingSubfield1) {
          cy.deleteSpecificationFieldSubfield(existingSubfield1.id);
        }
        if (existingSubfield2) {
          cy.deleteSpecificationFieldSubfield(existingSubfield2.id);
        }

        // Create first local subfield 'm'
        cy.createSpecificationFieldSubfield(standardField.id, subfieldPayload1).then(
          (createResp1) => {
            validateApiResponse(createResp1, 201);
            createdSubfield1 = createResp1.body;

            // Create second local subfield 'p'
            cy.createSpecificationFieldSubfield(standardField.id, subfieldPayload2).then(
              (createResp2) => {
                validateApiResponse(createResp2, 201);
                createdSubfield2 = createResp2.body;
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
    'C511213 Cannot update Local Subfield Code of Standard Field with duplicate "code" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C511213', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Try to update subfield with existing standard subfield code 'a' (should fail)
      const updateWithStandardCode = {
        code: 'a', // Standard subfield code that exists in field 011
        label: 'Subfield code a name duplicate',
        repeatable: subfieldPayload1.repeatable,
        required: subfieldPayload1.required,
        deprecated: subfieldPayload1.deprecated,
      };

      cy.updateSpecificationSubfield(createdSubfield1.id, updateWithStandardCode, false).then(
        (resp1) => {
          validateApiResponse(resp1, 400);
          expect(resp1.body.errors[0].message, 'Step 1: Duplicate standard code error').to.include(
            "The 'code' must be unique",
          );
        },
      );

      // Step 2: Try to update subfield with existing local subfield code (should fail)
      const updateWithLocalCode = {
        code: subfieldPayload2.code, // Update first subfield to use second subfield's code
        label: 'Subfield code p name duplicate',
        repeatable: subfieldPayload1.repeatable,
        required: subfieldPayload1.required,
        deprecated: subfieldPayload1.deprecated,
      };

      cy.updateSpecificationSubfield(createdSubfield1.id, updateWithLocalCode, false).then(
        (resp2) => {
          validateApiResponse(resp2, 400);
          expect(resp2.body.errors[0].message, 'Step 2: Duplicate local code error').to.include(
            "The 'code' must be unique",
          );
        },
      );

      // Step 3: Verify no changes were made to existing subfields
      cy.getSpecificationFieldSubfields(standardField.id).then((getResp) => {
        validateApiResponse(getResp, 200);
        expect(getResp.body.subfields).to.have.length.greaterThan(0);

        // Verify first subfield still has original code and label
        const firstSubfield = findLocalSubfield(getResp.body.subfields, subfieldPayload1.code);
        expect(firstSubfield, 'Step 3: First subfield still exists with original code').to.exist;
        expect(firstSubfield.code, 'Step 3: First subfield code unchanged').to.eq(
          subfieldPayload1.code,
        );
        expect(firstSubfield.label, 'Step 3: First subfield label unchanged').to.eq(
          subfieldPayload1.label,
        );

        // Verify second subfield still has original code and label
        const secondSubfield = findLocalSubfield(getResp.body.subfields, subfieldPayload2.code);
        expect(secondSubfield, 'Step 3: Second subfield still exists with original code').to.exist;
        expect(secondSubfield.code, 'Step 3: Second subfield code unchanged').to.eq(
          subfieldPayload2.code,
        );
        expect(secondSubfield.label, 'Step 3: Second subfield label unchanged').to.eq(
          subfieldPayload2.label,
        );

        // Verify standard subfield 'a' still exists
        const standardSubfieldA = findStandardSubfield(getResp.body.subfields, 'a');
        expect(standardSubfieldA, 'Step 3: Standard subfield a still exists').to.exist;
        expect(standardSubfieldA.scope, 'Step 3: Standard subfield a has correct scope').to.eq(
          'standard',
        );
      });
    },
  );
});
