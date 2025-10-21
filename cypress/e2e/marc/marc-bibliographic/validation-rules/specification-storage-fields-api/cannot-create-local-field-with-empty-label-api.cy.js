/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  generateTestFieldData,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Empty Label API', () => {
  // User with both GET and POST permissions to create fields (but validation should prevent invalid requests)
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;

  const testCaseId = 'C490926';

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        // Clean up any existing field with tag 982 to avoid conflicts
        cy.deleteSpecificationFieldByTag(bibSpecId, '982', false);
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
    'C490926 Cannot create Local Field with empty "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C490926', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Define test scenarios with empty label validation
      const emptyLabelScenarios = [
        {
          description: 'missing label field',
          fieldOptions: {
            tag: '982',
            url: 'http://www.example.org/field100.html',
            // No label field provided
          },
          expectedError: "The 'label' field is required.",
        },
        {
          description: 'empty label field',
          fieldOptions: {
            tag: '982',
            label: '',
            url: 'http://www.example.org/field100.html',
          },
          expectedError: "The 'label' field is required.",
        },
        {
          description: 'space-only label field',
          fieldOptions: {
            tag: '982',
            label: ' ',
            url: 'http://www.example.org/field100.html',
          },
          expectedError: "The 'label' field is required.",
        },
      ];

      // Test each empty label scenario
      emptyLabelScenarios.forEach((scenario, index) => {
        // Generate field data using helper, but override with scenario-specific options
        const baseFieldData = generateTestFieldData(testCaseId, {
          tag: '982',
          label: 'Test_Field', // Default label that gets overridden
          url: 'http://www.example.org/field100.html',
        });

        // Apply scenario-specific field options (may remove or override label)
        const fieldData = { ...baseFieldData, ...scenario.fieldOptions };

        // For missing label scenario, explicitly remove the label property
        if (scenario.description === 'missing label field') {
          delete fieldData.label;
        }

        cy.createSpecificationField(bibSpecId, fieldData, false).then((response) => {
          cy.log(`Step ${index + 1}: Testing ${scenario.description}`);

          if (response.status === 201) {
            // Field was created successfully - this means validation didn't catch the issue
            // Clean up the created field
            if (response.body && response.body.id) {
              cy.deleteSpecificationField(response.body.id, false);
            }
            // The test should fail since we expected a 400 error
            expect(response.status, `Expected validation error for ${scenario.description}`).to.eq(
              400,
            );
          } else {
            expect(response.status).to.eq(400);
            expect(response.body.errors).to.exist;
            expect(response.body.errors).to.have.length.greaterThan(0);

            // Check for the specific label required error message
            const errorMessages = response.body.errors.map((error) => error.message);
            expect(
              errorMessages.some((msg) => msg.includes(scenario.expectedError)),
              `Expected error message "${scenario.expectedError}" not found for ${scenario.description}. Actual errors: ${JSON.stringify(errorMessages)}`,
            ).to.be.true;
          }
        });
      });
    },
  );
});
