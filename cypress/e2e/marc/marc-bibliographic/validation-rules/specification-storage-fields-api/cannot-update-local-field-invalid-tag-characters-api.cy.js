/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Local Field Invalid Tag Characters API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '995';

  function validateErrorResponse(response, expectedStatus, expectedMessages) {
    expect(response.status).to.eq(expectedStatus);
    expect(response.body.errors).to.exist;
    expect(response.body.errors).to.have.length.greaterThan(0);

    const errorMessages = response.body.errors.map((error) => error.message);
    expectedMessages.forEach((expectedMsg) => {
      expect(
        errorMessages.some((msg) => msg.includes(expectedMsg)),
        `Expected error message "${expectedMsg}" not found. Actual errors: ${JSON.stringify(errorMessages)}`,
      ).to.be.true;
    });
  }

  let user;
  let bibSpecId;
  let localFieldId;

  before('Create user and setup test data', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;

        // Clean up any existing local field with tag before test execution
        cy.getSpecificationFields(bibSpecId).then((response) => {
          const existingLocalField = response.body.fields.find(
            (f) => f.tag === LOCAL_FIELD_TAG && f.scope === 'local',
          );
          if (existingLocalField) {
            cy.deleteSpecificationField(existingLocalField.id, false);
          }
        });

        // Create a local field for testing validation
        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C490939_Test Local Field',
          url: 'http://www.example.org/field995.html',
          repeatable: true,
          required: false,
          deprecated: false,
          scope: 'local',
        };

        cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
          expect(fieldResp.status).to.eq(201);
          localFieldId = fieldResp.body.id;
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490939 Cannot update Local Field with invalid chars in "tag" (letters, special characters, spaces) for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C490939', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Test scenarios with invalid tag characters
      const invalidTagScenarios = [
        {
          description: 'single space',
          tag: ' ',
          expectedMessages: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9.",
            "The 'tag' field is required.",
          ],
        },
        {
          description: 'space with number and space',
          tag: ' 9 ',
          expectedMessages: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9.",
          ],
        },
        {
          description: 'three spaces',
          tag: '   ',
          expectedMessages: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9.",
            "The 'tag' field is required.",
          ],
        },
        {
          description: 'three lowercase letters',
          tag: 'abc',
          expectedMessages: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9.",
          ],
        },
        {
          description: 'numbers with lowercase letter',
          tag: '99a',
          expectedMessages: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9.",
          ],
        },
        {
          description: 'numbers with special character',
          tag: '99$',
          expectedMessages: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9.",
          ],
        },
        {
          description: 'three special characters',
          tag: '!#$',
          expectedMessages: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9.",
          ],
        },
        {
          description: 'number, letter, and special character',
          tag: '9s$',
          expectedMessages: [
            "A 'tag' field must contain three characters and can only accept numbers 0-9.",
          ],
        },
      ];

      invalidTagScenarios.forEach((scenario) => {
        cy.log(`Testing ${scenario.description}: "${scenario.tag}"`);

        const updatePayload = {
          tag: scenario.tag,
          label: 'Name test field',
        };

        cy.updateSpecificationField(localFieldId, updatePayload, false).then((response) => {
          validateErrorResponse(response, 400, scenario.expectedMessages);
        });
      });
    },
  );
});
