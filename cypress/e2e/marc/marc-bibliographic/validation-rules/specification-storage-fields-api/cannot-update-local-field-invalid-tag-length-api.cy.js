/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Local Field Invalid Tag Length API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '996';

  function validateErrorResponse(response, expectedStatus, expectedMessage) {
    expect(response.status).to.eq(expectedStatus);
    expect(response.body.errors).to.exist;
    expect(response.body.errors).to.have.length.greaterThan(0);

    const errorMessages = response.body.errors.map((error) => error.message);
    expect(
      errorMessages.some((msg) => msg.includes(expectedMessage)),
      `Expected error message "${expectedMessage}" not found. Actual errors: ${JSON.stringify(errorMessages)}`,
    ).to.be.true;
  }

  let user;
  let bibSpecId;
  let localFieldId;

  before('Create user and setup test data', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
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
          label: 'AT_C490938_Test Local Field',
          url: 'http://www.example.org/field996.html',
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
    'C490938 Cannot update Local Field with invalid "tag" length for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C490938', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      const expectedErrorMessage =
        "A 'tag' field must contain three characters and can only accept numbers 0-9.";

      // Test scenarios with invalid tag lengths
      const tagLengthScenarios = [
        {
          description: 'tag with 1 character',
          tag: '1',
        },
        {
          description: 'tag with 2 characters',
          tag: '91',
        },
        {
          description: 'tag with 4 characters',
          tag: '9131',
        },
      ];

      tagLengthScenarios.forEach((scenario) => {
        cy.log(`Testing ${scenario.description}: "${scenario.tag}"`);

        const updatePayload = {
          tag: scenario.tag,
          label: 'Name test field',
        };

        cy.updateSpecificationField(localFieldId, updatePayload, false).then((response) => {
          validateErrorResponse(response, 400, expectedErrorMessage);
        });
      });
    },
  );
});
