/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot update Local Subfield Code with invalid label length for Standard field API', () => {
  let user;
  let bibSpecId;
  let standardField;
  let createdSubfield;
  const STANDARD_FIELD_TAG = '011'; // Linking ISSN - Standard Field (deprecated)

  // Subfield payload declaration
  const subfieldPayload = {
    code: 'q',
    label: 'AT_C511215_Test subfield q',
    repeatable: true,
    required: false,
    deprecated: false,
  };

  // Test labels for validation
  const LABEL_351_CHARS =
    '351 character test Label validation during creation of validation rule for MARC bibliographic record via API (351 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 351 character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographicc';
  const LABEL_350_CHARS =
    '350 character test Label validation during creation of validation rule for MARC bibliographic record via API (350 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 35 0character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographic';
  const LABEL_349_CHARS =
    '349 character test Label validation during creation of validation rule for MARC bibliographic record via API (350 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 35 0character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographi';
  const LABEL_1_CHAR = '1';

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
    'C511215 Cannot update Local Subfield Code of Standard Field with invalid "label" length for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C511215', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Update subfield with label > 350 characters (should fail)
      const updateWith351Chars = {
        code: 'x',
        label: LABEL_351_CHARS,
        repeatable: subfieldPayload.repeatable,
        required: subfieldPayload.required,
        deprecated: subfieldPayload.deprecated,
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWith351Chars, false).then(
        (resp1) => {
          validateApiResponse(resp1, 400);
          expect(resp1.body.errors[0].message, 'Step 1: Label too long error').to.include(
            "The 'label' field has exceeded 350 character limit",
          );
        },
      );

      // Step 2: Update subfield with label = 350 characters (should succeed)
      const updateWith350Chars = {
        code: 'x',
        label: LABEL_350_CHARS,
        repeatable: subfieldPayload.repeatable,
        required: subfieldPayload.required,
        deprecated: subfieldPayload.deprecated,
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWith350Chars).then((resp2) => {
        validateApiResponse(resp2, 202);
        expect(resp2.body.code, 'Step 2: Updated with 350 char label').to.eq('x');
        expect(resp2.body.label, 'Step 2: Label updated to 350 chars').to.eq(LABEL_350_CHARS);
        expect(resp2.body.label.length, 'Step 2: Label length is 350').to.eq(350);
      });

      // Step 3: Update subfield with label = 349 characters (should succeed)
      const updateWith349Chars = {
        code: 'y',
        label: LABEL_349_CHARS,
        repeatable: subfieldPayload.repeatable,
        required: subfieldPayload.required,
        deprecated: subfieldPayload.deprecated,
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWith349Chars).then((resp3) => {
        validateApiResponse(resp3, 202);
        expect(resp3.body.code, 'Step 3: Updated with 349 char label').to.eq('y');
        expect(resp3.body.label, 'Step 3: Label updated to 349 chars').to.eq(LABEL_349_CHARS);
        expect(resp3.body.label.length, 'Step 3: Label length is 349').to.eq(349);
      });

      // Step 4: Update subfield with label = 1 character (should succeed)
      const updateWith1Char = {
        code: 'v',
        label: LABEL_1_CHAR,
        repeatable: subfieldPayload.repeatable,
        required: subfieldPayload.required,
        deprecated: subfieldPayload.deprecated,
      };

      cy.updateSpecificationSubfield(createdSubfield.id, updateWith1Char).then((resp4) => {
        validateApiResponse(resp4, 202);
        expect(resp4.body.code, 'Step 4: Updated with 1 char label').to.eq('v');
        expect(resp4.body.label, 'Step 4: Label updated to 1 char').to.eq(LABEL_1_CHAR);
        expect(resp4.body.label.length, 'Step 4: Label length is 1').to.eq(1);
      });
    },
  );
});
