/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Whitespace in URL API', () => {
  // User with both GET and POST permissions to create fields
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;

  const baseFieldPayload = {
    label: 'Name',
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
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490931 Cannot create Local Field with whitespace in "url" field for MARC bib spec (API) (spitfire)',
    { tags: ['C490931', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Test scenarios for URL whitespace validation
      const urlWhitespaceScenarios = [
        {
          description: 'URL with multiple concatenated values without spaces (should fail)',
          tag: '890',
          url: 'http://www.example.org/field899.htmlhttps://www.example2.org/field899.html',
          expectedStatus: 400,
          expectedError: "The 'url' field should be valid URL.",
        },
        {
          description: 'URL with space in the middle (should fail)',
          tag: '891',
          url: 'http://www.exam ple.org/field899.html',
          expectedStatus: 400,
          expectedError: "The 'url' field should be valid URL.",
        },
        {
          description: 'URL with space only (should fail)',
          tag: '892',
          url: ' ',
          expectedStatus: 400,
          expectedError: "The 'url' field should be valid URL.",
        },
      ];

      // Test each URL whitespace validation scenario
      urlWhitespaceScenarios.forEach((scenario) => {
        const payload = {
          ...baseFieldPayload,
          tag: scenario.tag,
          url: scenario.url,
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
