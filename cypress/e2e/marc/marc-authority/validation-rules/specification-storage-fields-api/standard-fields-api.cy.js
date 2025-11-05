/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Standard Fields API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let authoritySpecId;
  let standardField;

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
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
    'C499839 Cannot update Standard Field (except "url", "required") for MARC authority spec (API) (spitfire)',
    { tags: ['criticalPath', 'C499839', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., 100)
        standardField = findStandardField(response.body.fields, '100');
        expect(standardField, 'Standard field 100 exists').to.exist;

        // Store original field values for restoration
        const originalField = { ...standardField };

        // Define test cases for different field modifications
        const testCases = [
          {
            step: 1,
            fieldName: 'tag',
            payload: {
              tag: '101',
              label: 'Heading - Personal Name',
              url: 'https://www.loc.gov/marc/authority/ad100.html',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedErrorMessage: "The 'tag' modification is not allowed for standard scope.",
          },
          {
            step: 2,
            fieldName: 'label',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name updated',
              url: 'https://www.loc.gov/marc/authority/ad100.html',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedErrorMessage: "The 'label' modification is not allowed for standard scope.",
          },
          {
            step: 3,
            fieldName: 'repeatable',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name',
              url: 'https://www.loc.gov/marc/authority/ad100.html',
              repeatable: true,
              required: false,
              deprecated: false,
            },
            expectedErrorMessage:
              "The 'repeatable' modification is not allowed for standard scope.",
          },
          {
            step: 4,
            fieldName: 'deprecated',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name',
              url: 'https://www.loc.gov/marc/authority/ad100.html',
              repeatable: false,
              required: false,
              deprecated: true,
            },
            expectedErrorMessage:
              "The 'deprecated' modification is not allowed for standard scope.",
          },
        ];

        // Execute each test case
        testCases.forEach((testCase) => {
          cy.updateSpecificationField(standardField.id, testCase.payload, false).then(
            (updateResp) => {
              expect(updateResp.status).to.eq(400);
              expect(updateResp.body.errors[0].message).to.contain(testCase.expectedErrorMessage);
            },
          );
        });

        // Step 5: Verify standard validation rule didn't change
        cy.getSpecificationFields(authoritySpecId).then((getResp) => {
          expect(getResp.status).to.eq(200);

          // Find the same standard field again
          const unchangedField = findStandardField(getResp.body.fields, '100');
          expect(unchangedField, 'Standard field 100 still exists').to.exist;

          // Verify all original values are preserved
          expect(unchangedField.tag).to.eq(originalField.tag);
          expect(unchangedField.label).to.eq(originalField.label);
          expect(unchangedField.repeatable).to.eq(originalField.repeatable);
          expect(unchangedField.required).to.eq(originalField.required);
          expect(unchangedField.deprecated).to.eq(originalField.deprecated);
          expect(unchangedField.scope).to.eq('standard');
        });
      });
    },
  );

  it(
    'C499841 Cannot update Standard field with invalid "url" for MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C499841', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., field "100")
        standardField = findStandardField(response.body.fields, '100');
        expect(standardField, 'Standard field 100 exists').to.exist;

        // Step 1: Update standard field without "url" field (should succeed)
        const payloadWithoutUrl = {
          tag: '100',
          label: 'Heading - Personal Name',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(standardField.id, payloadWithoutUrl, true).then(
          (updateResp) => {
            expect(updateResp.status).to.eq(202);
            expect(updateResp.body).to.not.have.property('url');
          },
        );

        // Step 2: Verify the updated field doesn't have "url" field
        cy.getSpecificationFields(authoritySpecId).then((getResp) => {
          expect(getResp.status).to.eq(200);
          const updatedField = findStandardField(getResp.body.fields, '100');
          expect(updatedField).to.not.have.property('url');
        });

        // Step 3: Invalid URL validation test scenarios
        const invalidUrlScenarios = [
          {
            description: 'empty URL',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name',
              url: '',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedStatus: 400,
            expectedError: "The 'url' field should be valid URL.",
          },
          {
            description: 'URL without protocol',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name',
              url: 'www.loc.gov/marc/authority/ad100.html',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedStatus: 400,
            expectedError: "The 'url' field should be valid URL.",
          },
          {
            description: 'URL with invalid protocol',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name',
              url: 'https/www.loc.gov/marc/authority/ad100.html',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedStatus: 400,
            expectedError: "The 'url' field should be valid URL.",
          },
          {
            description: 'URL with space only',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name',
              url: ' ',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedStatus: 400,
            expectedError: "The 'url' field should be valid URL.",
          },
          {
            description: 'URL with space in the middle',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name',
              url: 'https://www.lo c.gov/marc/authority/ad100.html',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedStatus: 400,
            expectedError: "The 'url' field should be valid URL.",
          },
          {
            description: 'URL with multiple concatenated URLs',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name',
              url: 'https://www.loc.gov/marc/authority/ad100.https://www.loc.gov/marc/authority/ad1001.html',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedStatus: 400,
            expectedError: "The 'url' field should be valid URL.",
          },
        ];

        // Execute invalid URL test scenarios
        invalidUrlScenarios.forEach((scenario) => {
          cy.updateSpecificationField(standardField.id, scenario.payload, false).then(
            (updateResp) => {
              expect(updateResp.status, `${scenario.description} should fail with 400`).to.eq(
                scenario.expectedStatus,
              );
              expect(updateResp.body.errors).to.exist;
              expect(updateResp.body.errors[0].message).to.contain(scenario.expectedError);
            },
          );
        });

        // Step 4: Valid URL scenarios
        const validUrlScenarios = [
          {
            description: 'URL with spaces at beginning and end (should trim)',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name',
              url: ' https://www.loc.gov/marc/authority/ad100.html ',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedStatus: 202,
          },
          {
            description: 'valid updated URL',
            payload: {
              tag: '100',
              label: 'Heading - Personal Name',
              url: 'https://www.loc.gov/marc/authority/ad100/updated.html',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedStatus: 202,
          },
        ];

        // Execute valid URL test scenarios
        validUrlScenarios.forEach((scenario) => {
          cy.updateSpecificationField(standardField.id, scenario.payload, true).then(
            (updateResp) => {
              expect(updateResp.status, `${scenario.description} should succeed with 202`).to.eq(
                scenario.expectedStatus,
              );
              expect(updateResp.body.url).to.eq(scenario.payload.url.trim());
            },
          );
        });

        // Step 5: Final verification - Get updated field with valid URL
        cy.getSpecificationFields(authoritySpecId).then((finalResp) => {
          expect(finalResp.status).to.eq(200);
          const finalField = findStandardField(finalResp.body.fields, '100');
          expect(finalField, 'Standard field 100 still exists').to.exist;
          expect(finalField.url).to.eq('https://www.loc.gov/marc/authority/ad100/updated.html');
        });
      });
    },
  );

  it(
    'C499840 Cannot update Standard Field with invalid value in "required" for MARC authority spec (API) (spitfire)',
    { tags: ['criticalPath', 'C499840', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., 100)
        standardField = findStandardField(response.body.fields, '100');
        expect(standardField, 'Standard field 100 exists').to.exist;

        // Store original field values for restoration at the end
        const originalField = { ...standardField };

        // Base payload template
        const basePayload = {
          tag: '100',
          label: 'Heading - Personal Name',
          url: 'https://www.loc.gov/marc/authority/ad100.html',
          repeatable: false,
          deprecated: false,
        };

        // Define test cases for different "required" field scenarios
        const testScenarios = [
          {
            step: 1,
            description: 'Update field without "required" field (should use default value false)',
            payload: { ...basePayload },
            expectedStatus: 202,
            expectedRequired: false,
            shouldVerifyInSpec: false,
          },
          {
            step: 2,
            description: 'Update field with "required" set to true',
            payload: { ...basePayload, required: true },
            expectedStatus: 202,
            expectedRequired: true,
            shouldVerifyInSpec: true,
          },
          {
            step: 3,
            description: 'Update field with "required" set to false',
            payload: { ...basePayload, required: false },
            expectedStatus: 202,
            expectedRequired: false,
            shouldVerifyInSpec: true,
          },
          {
            step: 4,
            description: 'Attempt to update with invalid "required" field value',
            payload: { ...basePayload, required: 'test' },
            expectedStatus: 400,
            expectedError: 'JSON parse error',
            shouldVerifyInSpec: false,
          },
        ];

        // Execute each test scenario
        testScenarios.forEach((scenario) => {
          cy.updateSpecificationField(
            standardField.id,
            scenario.payload,
            scenario.expectedStatus === 202,
          ).then((updateResp) => {
            expect(updateResp.status).to.eq(scenario.expectedStatus);

            if (scenario.expectedStatus === 202) {
              expect(updateResp.body.required).to.eq(scenario.expectedRequired);
            } else if (scenario.expectedStatus === 400) {
              expect(updateResp.body).to.have.property('errors');
              expect(updateResp.body.errors[0].message).to.contain(scenario.expectedError);
            }

            // Verify field was updated in specification for specific steps
            if (scenario.shouldVerifyInSpec) {
              cy.getSpecificationFields(authoritySpecId).then((getResp) => {
                expect(getResp.status).to.eq(200);
                const updatedField = findStandardField(getResp.body.fields, '100');
                expect(updatedField, 'Standard field 100 still exists').to.exist;
                expect(updatedField.required).to.eq(scenario.expectedRequired);
              });
            }
          });
        });

        // Restore original field values
        cy.updateSpecificationField(standardField.id, originalField, true).then((restoreResp) => {
          expect(restoreResp.status).to.eq(202);
        });
      });
    },
  );
});
