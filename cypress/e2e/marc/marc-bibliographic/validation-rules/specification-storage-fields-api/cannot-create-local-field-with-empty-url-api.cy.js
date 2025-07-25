/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Empty URL API', () => {
  // User with both GET and POST permissions to create fields
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;
  const createdFieldIds = [];

  const baseFieldPayload = {
    label: 'Test name',
    repeatable: true,
    required: true,
  };

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
      });
    });
  });

  after('Delete test user and clean up created fields', () => {
    // Clean up any successfully created fields
    if (createdFieldIds.length > 0) {
      cy.getAdminToken();
      createdFieldIds.forEach((fieldId) => {
        cy.deleteSpecificationField(fieldId, false);
      });
    }

    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490929 Create Local Field with empty "url" for MARC bib spec (API) (spitfire)',
    { tags: ['C490929', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Test scenarios for URL validation
      const urlTestScenarios = [
        {
          description: 'field without url property (should succeed)',
          tag: '899',
          payload: {
            ...baseFieldPayload,
            tag: '899',
          },
          expectedStatus: 201,
          expectedUrlBehavior: 'absent', // url key should not be present in response
        },
        {
          description: 'field with empty url string (should fail)',
          tag: '901',
          payload: {
            ...baseFieldPayload,
            tag: '901',
            url: '',
          },
          expectedStatus: 400,
          expectedError: "The 'url' field should be valid URL.",
        },
      ];

      // Test each URL validation scenario
      urlTestScenarios.forEach((scenario) => {
        cy.createSpecificationField(bibSpecId, scenario.payload, false).then((response) => {
          expect(response.status).to.eq(scenario.expectedStatus);

          if (scenario.expectedStatus === 400) {
            // Validation should fail - check error message
            expect(response.body.errors).to.exist;
            expect(response.body.errors).to.have.length.greaterThan(0);

            const errorMessages = response.body.errors.map((error) => error.message);
            expect(
              errorMessages.some((msg) => msg.includes(scenario.expectedError)),
              `Expected error message "${scenario.expectedError}" not found for ${scenario.description}. Actual errors: ${JSON.stringify(errorMessages)}`,
            ).to.be.true;
          } else if (scenario.expectedStatus === 201) {
            // Field should be created successfully
            expect(response.body.id).to.exist;
            expect(response.body.tag).to.eq(scenario.tag);
            expect(response.body.label).to.eq(scenario.payload.label);

            // Check URL behavior based on test scenario
            if (scenario.expectedUrlBehavior === 'absent') {
              // URL key should not be present in response when not provided in payload
              expect(response.body).to.not.have.property('url');
            }

            // Store field ID for cleanup
            createdFieldIds.push(response.body.id);
          }
        });
      });
    },
  );
});
