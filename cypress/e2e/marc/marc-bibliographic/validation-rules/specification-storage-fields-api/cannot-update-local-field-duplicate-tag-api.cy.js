/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Local Field Duplicate Tag API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '994';
  const ADDITIONAL_LOCAL_FIELD_TAG = '899';

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

        // Clean up any existing local fields with our test tags
        cy.getSpecificationFields(bibSpecId).then((response) => {
          const existingLocalField = response.body.fields.find(
            (f) => f.tag === LOCAL_FIELD_TAG && f.scope === 'local',
          );
          if (existingLocalField) {
            cy.deleteSpecificationField(existingLocalField.id, false);
          }

          const existingAdditionalField = response.body.fields.find(
            (f) => f.tag === ADDITIONAL_LOCAL_FIELD_TAG && f.scope === 'local',
          );
          if (existingAdditionalField) {
            cy.deleteSpecificationField(existingAdditionalField.id, false);
          }
        });

        // Create the main local field for testing validation
        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C490940_Test Local Field',
          url: 'http://www.example.org/field994.html',
          repeatable: true,
          required: false,
          deprecated: false,
          scope: 'local',
        };

        cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
          expect(fieldResp.status).to.eq(201);
          localFieldId = fieldResp.body.id;

          // Create an additional local field to test duplicate local tag scenario
          const additionalFieldPayload = {
            tag: ADDITIONAL_LOCAL_FIELD_TAG,
            label: 'AT_C490940_Additional Local Field',
            url: 'http://www.example.org/field899.html',
            repeatable: true,
            required: false,
            deprecated: false,
            scope: 'local',
          };

          cy.createSpecificationField(bibSpecId, additionalFieldPayload).then((additionalResp) => {
            expect(additionalResp.status).to.eq(201);
          });
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
    'C490940 Cannot update Local Field with duplicate "tag" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C490940', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      const expectedErrorMessage = "The 'tag' must be unique.";

      // Test scenarios with duplicate tags
      const duplicateTagScenarios = [
        {
          description: 'System validation rule tag (245 - Title Statement)',
          tag: '245',
        },
        {
          description: 'Standard validation rule tag (100 - Main Entry--Personal Name)',
          tag: '100',
        },
        {
          description: 'Another Local validation rule tag (899)',
          tag: ADDITIONAL_LOCAL_FIELD_TAG,
        },
      ];

      duplicateTagScenarios.forEach((scenario) => {
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
