/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot update Local Subfield Code with invalid value for Standard field API', () => {
  let user;
  let bibSpecId;
  let standardField;
  let createdSubfield;
  const STANDARD_FIELD_TAG = '011'; // Linking ISSN - Standard Field (deprecated)
  const SUBFIELD_CODE = 'u'; // Use a unique code that doesn't exist by default in 011

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

  beforeEach('Setup user session and create test subfield', () => {
    cy.getUserToken(user.username, user.password);

    // Get standard field 011
    cy.getSpecificationFields(bibSpecId).then((response) => {
      validateApiResponse(response, 200);
      standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
      expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

      // Remove existing subfield 'u' if it exists
      cy.getSpecificationFieldSubfields(standardField.id).then((subfieldsResp) => {
        validateApiResponse(subfieldsResp, 200);
        const existingSubfield = findLocalSubfield(subfieldsResp.body.subfields, SUBFIELD_CODE);
        if (existingSubfield) {
          cy.deleteSpecificationFieldSubfield(existingSubfield.id);
        }

        // Create a local subfield 'u' for the standard field 011
        const subfieldPayload = {
          code: SUBFIELD_CODE,
          label: `AT_C511199_Test subfield ${SUBFIELD_CODE}`,
          repeatable: true,
          required: false,
          deprecated: false,
        };

        cy.createSpecificationFieldSubfield(standardField.id, subfieldPayload).then(
          (createResp) => {
            validateApiResponse(createResp, 201);
            createdSubfield = createResp.body;
            expect(createdSubfield.code, 'Created subfield has correct code').to.eq(SUBFIELD_CODE);
          },
        );
      });
    });
  });

  afterEach('Clean up created subfield', () => {
    if (createdSubfield?.id) {
      cy.getAdminToken();
      cy.deleteSpecificationFieldSubfield(createdSubfield.id, false);
      createdSubfield = null;
    }
  });

  after('Complete cleanup', () => {
    cy.getAdminToken();
    if (createdSubfield?.id) {
      cy.deleteSpecificationFieldSubfield(createdSubfield.id, false);
    }
    Users.deleteViaApi(user.userId);
  });

  it(
    'C511199 Cannot update Local Subfield Code of Standard field with invalid value in "code" field for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C511199', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Update subfield without "code" field (should fail)
      const updateWithoutCode = {
        label: 'Code 1 name',
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithoutCode, false).then((resp1) => {
        validateApiResponse(resp1, 400);
        expect(resp1.body.errors[0].message, 'Step 1: Missing code field error').to.include(
          "The 'code' field is required",
        );
      });

      // Step 2: Update subfield with 2 digits in "code" field (should fail)
      const updateWithTwoDigits = {
        code: '12',
        label: 'Code 1 name',
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithTwoDigits, false).then(
        (resp2) => {
          validateApiResponse(resp2, 400);
          expect(resp2.body.errors[0].message, 'Step 2: Two digits error').to.include(
            "A 'code' field must contain one character and can only accept numbers 0-9 or letters a-z",
          );
        },
      );

      // Step 3: Update subfield with valid lowercase letter (should succeed)
      const updateWithValidLetter = {
        code: 'j',
        label: 'Code j name',
        repeatable: createdSubfield.repeatable,
        required: createdSubfield.required,
        deprecated: createdSubfield.deprecated,
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithValidLetter).then((resp3) => {
        validateApiResponse(resp3, 202);
        expect(resp3.body.code, 'Step 3: Updated with valid letter').to.eq('j');
        expect(resp3.body.label, 'Step 3: Label updated').to.eq('Code j name');
      });

      // Step 4: Update subfield with uppercase letter (should fail)
      const updateWithUppercaseLetter = {
        code: 'O',
        label: 'Code j name',
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithUppercaseLetter, false).then(
        (resp4) => {
          validateApiResponse(resp4, 400);
          expect(resp4.body.errors[0].message, 'Step 4: Uppercase letter error').to.include(
            "A 'code' field must contain one character and can only accept numbers 0-9 or letters a-z",
          );
        },
      );

      // Step 5: Update subfield with valid digit (should succeed)
      const updateWithValidDigit = {
        code: '5',
        label: 'Code 5 name',
        repeatable: createdSubfield.repeatable,
        required: createdSubfield.required,
        deprecated: createdSubfield.deprecated,
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithValidDigit).then((resp5) => {
        validateApiResponse(resp5, 202);
        expect(resp5.body.code, 'Step 5: Updated with valid digit').to.eq('5');
        expect(resp5.body.label, 'Step 5: Label updated').to.eq('Code 5 name');
      });

      // Step 6: Update subfield with whitespace (should fail)
      const updateWithWhitespace = {
        code: ' ',
        label: 'Code 3 name',
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithWhitespace, false).then(
        (resp6) => {
          validateApiResponse(resp6, 400);
          const errorMessages = resp6.body.errors.map((error) => error.message);

          expect(errorMessages).to.include("The 'code' field is required.");
          expect(errorMessages).to.include(
            "A 'code' field must contain one character and can only accept numbers 0-9 or letters a-z.",
          );
        },
      );

      // Step 7: Update subfield with special character (should fail)
      const updateWithSpecialChar = {
        code: '/',
        label: 'Code 1 name',
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithSpecialChar, false).then(
        (resp7) => {
          validateApiResponse(resp7, 400);
          expect(resp7.body.errors[0].message, 'Step 7: Special character error').to.include(
            "A 'code' field must contain one character and can only accept numbers 0-9 or letters a-z",
          );
        },
      );

      // Step 8: Update subfield with non-English character (should fail)
      const updateWithNonEnglishChar = {
        code: 'п',
        label: 'Code 1 name',
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWithNonEnglishChar, false).then(
        (resp8) => {
          validateApiResponse(resp8, 400);
          expect(resp8.body.errors[0].message, 'Step 8: Non-English character error').to.include(
            "A 'code' field must contain one character and can only accept numbers 0-9 or letters a-z",
          );
        },
      );
    },
  );
});
