/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Invalid Tag Characters API', () => {
  // User with both GET and POST permissions to create fields (but validation should prevent invalid requests)
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;

  const baseFieldPayload = {
    label: 'AT_C490923_Custom Field - Contributor Data',
    url: 'http://www.example.org/field100.html',
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

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490923 Cannot create Local Field with invalid chars in "tag" (letters, special characters, spaces) for MARC bib spec (API) (spitfire)',
    { tags: ['C490923', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Define test scenarios with expected error messages
      const testScenarios = [
        {
          description: 'single space in tag',
          tag: ' ',
          expectedErrors: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
            "The 'tag' field is required",
          ],
        },
        {
          description: 'digit with spaces',
          tag: ' 1 ',
          expectedErrors: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
          ],
        },
        {
          description: 'three spaces',
          tag: '   ',
          expectedErrors: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
            "The 'tag' field is required",
          ],
        },
        {
          description: 'all letters',
          tag: 'abc',
          expectedErrors: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
          ],
        },
        {
          description: 'digits and letter',
          tag: '99a',
          expectedErrors: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
          ],
        },
        {
          description: 'digits and special character',
          tag: '99$',
          expectedErrors: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
          ],
        },
        {
          description: 'all special characters',
          tag: '!#$',
          expectedErrors: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
          ],
        },
        {
          description: 'mixed invalid characters',
          tag: '9s%',
          expectedErrors: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
          ],
        },
      ];

      // Test each scenario
      testScenarios.forEach((scenario, index) => {
        const payload = {
          ...baseFieldPayload,
          tag: scenario.tag,
        };

        cy.createSpecificationField(bibSpecId, payload, false).then((response) => {
          cy.log(`Step ${index + 1}: Testing ${scenario.description}`);

          expect(response.status).to.eq(400);
          expect(response.body.errors).to.exist;
          expect(response.body.errors).to.have.length.greaterThan(0);

          // Check for all expected error messages
          const errorMessages = response.body.errors.map((error) => error.message);
          scenario.expectedErrors.forEach((expectedError) => {
            expect(
              errorMessages.some((msg) => msg.includes(expectedError)),
              `Expected error message "${expectedError}" not found for ${scenario.description}`,
            ).to.be.true;
          });
        });
      });
    },
  );
});
