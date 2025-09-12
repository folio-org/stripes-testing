/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Indicator Code Invalid Code API', () => {
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
  ];

  const LOCAL_FIELD_TAG = '985';

  // Expected error messages - centralized for maintainability
  const ERROR_MESSAGES = {
    INVALID_CODE_FORMAT:
      "'code' field must contain one character and can only accept numbers 0-9, letters a-z or a '#'.",
    REQUIRED_FIELD: "The 'code' field is required",
    INVALID_CHARACTER: "'code' field must contain one character",
  };

  let user;
  let bibSpecId;
  let localFieldId;
  let indicatorId;
  let indicatorCodeId;

  before('Create user and setup test data', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;

        cy.getSpecificationFields(bibSpecId).then((response) => {
          const existingLocalField = response.body.fields.find(
            (f) => f.tag === LOCAL_FIELD_TAG && f.scope === 'local',
          );
          if (existingLocalField) {
            cy.deleteSpecificationField(existingLocalField.id, false);
          }
        });

        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C502983_Local Field with Indicator Code',
          url: 'http://www.example.org/field985.html',
          repeatable: true,
          required: false,
          deprecated: false,
          scope: 'local',
        };

        cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
          expect(fieldResp.status).to.eq(201);
          localFieldId = fieldResp.body.id;

          // Create an indicator for this local field
          const indicatorPayload = {
            order: 1,
            label: 'Test Indicator for Code Validation',
          };

          cy.createSpecificationFieldIndicator(localFieldId, indicatorPayload).then(
            (indicatorResp) => {
              expect(indicatorResp.status).to.eq(201);
              indicatorId = indicatorResp.body.id;

              // Create an indicator code for testing
              const indicatorCodePayload = {
                code: '0',
                label: 'Initial Code Label',
                deprecated: false,
              };

              cy.createSpecificationIndicatorCode(indicatorId, indicatorCodePayload).then(
                (codeResp) => {
                  expect(codeResp.status).to.eq(201);
                  indicatorCodeId = codeResp.body.id;
                },
              );
            },
          );
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
    cy.getAdminToken();
    if (localFieldId) {
      cy.deleteSpecificationField(localFieldId, false);
    }
    if (user) {
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502983 Cannot update Indicator code of Local field with invalid "code" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502983', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Test length constraint - code must be exactly 1 character
      const updatePayload1 = {
        code: '22', // Invalid: 2 characters
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(indicatorCodeId, updatePayload1, false).then(
        (response1) => {
          expect(response1.status, 'Step 1: Update with 2 digits should fail').to.eq(400);
          expect(response1.body, 'Response body should exist').to.exist;
          expect(response1.body.errors, 'Should contain errors array').to.exist;
          expect(response1.body.errors).to.have.length.greaterThan(0);

          // Validate specific error message for length constraint
          const errorMessage = response1.body.errors[0].message;
          expect(errorMessage, 'Should contain code validation error').to.include(
            ERROR_MESSAGES.INVALID_CODE_FORMAT,
          );

          // Validate error structure (flexible to handle optional fields)
          expect(response1.body.errors[0], 'Error should have required fields').to.include.all.keys(
            ['message', 'type', 'code'],
          );
        },
      );

      // Step 2: Test whitespace validation - should fail with multiple errors
      const updatePayload2 = {
        code: ' ', // Invalid: whitespace character
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(indicatorCodeId, updatePayload2, false).then(
        (response2) => {
          expect(response2.status, 'Step 2: Update with whitespace should fail').to.eq(400);
          expect(response2.body, 'Response body should exist').to.exist;
          expect(response2.body.errors, 'Should contain errors array').to.exist;
          // Should contain both error messages for whitespace
          const errorMessages = response2.body.errors.map((error) => error.message);
          expect(
            errorMessages.some((msg) => msg.includes(ERROR_MESSAGES.INVALID_CHARACTER)),
            'Should contain character validation error',
          ).to.be.true;
          expect(
            errorMessages.some((msg) => msg.includes(ERROR_MESSAGES.REQUIRED_FIELD)),
            'Should contain required field error',
          ).to.be.true;
        },
      );

      // Step 3: Test missing required field - should fail
      const updatePayload3 = {
        // Missing 'code' field entirely
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(indicatorCodeId, updatePayload3, false).then(
        (response3) => {
          expect(response3.status, 'Step 3: Update without code field should fail').to.eq(400);
          expect(response3.body, 'Response body should exist').to.exist;
          expect(response3.body.errors, 'Should contain errors array').to.exist;
          expect(
            response3.body.errors[0].message,
            'Should contain required field error',
          ).to.include(ERROR_MESSAGES.REQUIRED_FIELD);
        },
      );

      // Step 4: Update indicator code with "/" - should fail
      const updatePayload4 = {
        code: '/',
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(indicatorCodeId, updatePayload4, false).then(
        (response4) => {
          expect(response4.status, 'Step 4: Update with "/" should fail').to.eq(400);
          expect(response4.body, 'Response body should exist').to.exist;
          expect(response4.body.errors, 'Should contain errors array').to.exist;
          expect(
            response4.body.errors[0].message,
            'Should contain code validation error',
          ).to.include(
            "'code' field must contain one character and can only accept numbers 0-9, letters a-z or a '#'.",
          );
        },
      );

      // Step 5: Update indicator code with "\" - should fail
      const updatePayload5 = {
        code: '\\',
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(indicatorCodeId, updatePayload5, false).then(
        (response5) => {
          expect(response5.status, 'Step 5: Update with "\\" should fail').to.eq(400);
          expect(response5.body, 'Response body should exist').to.exist;
          expect(response5.body.errors, 'Should contain errors array').to.exist;
          expect(
            response5.body.errors[0].message,
            'Should contain code validation error',
          ).to.include(
            "'code' field must contain one character and can only accept numbers 0-9, letters a-z or a '#'.",
          );
        },
      );

      // Step 6: Update indicator code with letter "a" - should succeed
      const updatePayload6 = {
        code: 'a',
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(indicatorCodeId, updatePayload6).then((response6) => {
        expect(response6.status, 'Step 6: Update with letter "a" should succeed').to.eq(202);
        expect(response6.body, 'Response body should exist').to.exist;
        expect(response6.body.id).to.eq(indicatorCodeId);
        expect(response6.body.code).to.eq('a');
        expect(response6.body.label).to.eq('Code 2 name');
        expect(response6.body.deprecated).to.eq(false);
      });

      // Step 7: Update indicator code with "#" - should succeed
      const updatePayload7 = {
        code: '#',
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(indicatorCodeId, updatePayload7).then((response7) => {
        expect(response7.status, 'Step 7: Update with "#" should succeed').to.eq(202);
        expect(response7.body, 'Response body should exist').to.exist;
        expect(response7.body.id).to.eq(indicatorCodeId);
        expect(response7.body.code).to.eq('#');
        expect(response7.body.label).to.eq('Code 2 name');
        expect(response7.body.deprecated).to.eq(false);
      });

      // Step 8: GET indicator codes to verify final state
      cy.getSpecificationIndicatorCodes(indicatorId).then((response8) => {
        expect(response8.status, 'Step 8: GET indicator codes should succeed').to.eq(200);
        expect(response8.body, 'Response body should exist').to.exist;
        expect(response8.body.codes, 'Should contain indicator codes array').to.exist;
        expect(response8.body.codes).to.have.length(1);

        const indicatorCode = response8.body.codes[0];
        expect(indicatorCode.id).to.eq(indicatorCodeId);
        expect(indicatorCode.code).to.eq('#');
        expect(indicatorCode.label).to.eq('Code 2 name');
        expect(indicatorCode.deprecated).to.eq(false);
      });
    },
  );
});
