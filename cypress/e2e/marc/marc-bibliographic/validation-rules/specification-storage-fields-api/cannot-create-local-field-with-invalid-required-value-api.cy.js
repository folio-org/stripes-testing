/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Invalid Required Value API', () => {
  // User with both GET and POST permissions to create fields
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;

  const baseFieldPayload = {
    tag: '899',
    label: 'Name',
    url: 'http://www.example.org/field899.html',
  };

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
      });
    });
  });

  after('Delete test user and clean up created fields', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490933 Cannot create Local Field with invalid value in "required" field for MARC bib spec (API) (spitfire)',
    { tags: ['C490933', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Test scenarios for required field validation
      const requiredValidationScenarios = [
        {
          description: 'Required field with unrecognized token "test" (should fail)',
          required: 'test',
          expectedStatus: 400,
          expectedError: 'JSON parse error',
        },
      ];

      // Test each required field validation scenario
      requiredValidationScenarios.forEach((scenario) => {
        const payload = {
          ...baseFieldPayload,
          required: scenario.required,
        };

        cy.createSpecificationField(bibSpecId, payload, false).then((response) => {
          expect(response.status).to.eq(scenario.expectedStatus);

          // Validation should fail - check error message
          expect(response.body.errors).to.exist;
          expect(response.body.errors).to.have.length.greaterThan(0);

          const errorMessages = response.body.errors.map((error) => error.message);
          expect(
            errorMessages.some((msg) => msg.includes(scenario.expectedError)),
            `Expected error message "${scenario.expectedError}" not found for ${scenario.description}. Actual errors: ${JSON.stringify(errorMessages)}`,
          ).to.be.true;
        });
      });
    },
  );
});
