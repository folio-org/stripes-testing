/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Local Field Empty Label API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '993';

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
          label: 'AT_C490941_Test Local Field',
          url: 'http://www.example.org/field993.html',
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
    'C490941 Cannot update Local Field with empty "label" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C490941', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      const expectedErrorMessage = "The 'label' field is required.";

      // Test scenarios with missing or empty label
      const payload = {
        tag: LOCAL_FIELD_TAG,
        url: 'http://www.example.org/field993.html',
        repeatable: true,
        required: true,
      };
      const labelValidationScenarios = [
        {
          description: 'missing label field',
          updatePayload: { ...payload },
        },
        {
          description: 'empty label field',
          updatePayload: {
            ...payload,
            label: '',
          },
        },
        {
          description: 'label field with single space',
          updatePayload: {
            ...payload,
            label: ' ',
          },
        },
      ];

      labelValidationScenarios.forEach((scenario) => {
        cy.log(`Testing ${scenario.description}`);

        cy.updateSpecificationField(localFieldId, scenario.updatePayload, false).then(
          (response) => {
            validateErrorResponse(response, 400, expectedErrorMessage);
          },
        );
      });
    },
  );
});
