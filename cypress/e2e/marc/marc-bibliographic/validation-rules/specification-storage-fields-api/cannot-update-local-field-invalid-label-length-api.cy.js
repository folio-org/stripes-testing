/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Local Field Invalid Label Length API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '992';

  function validateResponse(response, expectedStatus, expectedMessage = null) {
    expect(response.status).to.eq(expectedStatus);

    if (expectedStatus === 400 && expectedMessage) {
      expect(response.body.errors).to.exist;
      expect(response.body.errors).to.have.length.greaterThan(0);
      const errorMessages = response.body.errors.map((error) => error.message);
      expect(
        errorMessages.some((msg) => msg.includes(expectedMessage)),
        `Expected error message "${expectedMessage}" not found. Actual errors: ${JSON.stringify(errorMessages)}`,
      ).to.be.true;
    } else if (expectedStatus === 202) {
      expect(response.body).to.exist;
      expect(response.body.id).to.exist;
    }
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
          label: 'AT_C490942_Test Local Field',
          url: 'http://www.example.org/field992.html',
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
    cy.getAdminToken();
    if (user) {
      Users.deleteViaApi(user.userId);
    }
    if (localFieldId) {
      cy.deleteSpecificationField(localFieldId, false);
    }
  });

  it(
    'C490942 Cannot update Local Field with invalid "label" length for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C490942', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Test scenarios with different label lengths
      const labelLengthScenarios = [
        {
          description: 'label with 351 characters (exceeds limit)',
          label:
            '351 character test Label validation during creation of validation rule for MARC bibliographic record via API (351 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 351 character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographicc',
          expectedStatus: 400,
          expectedError: "The 'label' field has exceeded 350 character limit",
        },
        {
          description: 'label with exactly 350 characters (valid)',
          label:
            '350 character test Label validation during creation of validation rule for MARC bibliographic record via API (350 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 35 0character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographic',
          expectedStatus: 202,
        },
        {
          description: 'label with 349 characters (valid)',
          label:
            '349 character test Label validation during creation of validation rule for MARC bibliographic record via API (350 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 35 0character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographi',
          expectedStatus: 202,
        },
        {
          description: 'label with 1 character (valid)',
          label: '1',
          expectedStatus: 202,
        },
      ];

      // Test each label length scenario
      labelLengthScenarios.forEach((scenario) => {
        cy.log(`Testing ${scenario.description}`);

        const updatePayload = {
          tag: LOCAL_FIELD_TAG,
          label: scenario.label,
          url: 'http://www.example.org/field100.html',
          repeatable: true,
          required: false,
        };

        cy.updateSpecificationField(localFieldId, updatePayload, false).then((response) => {
          validateResponse(response, scenario.expectedStatus, scenario.expectedError);
        });
      });

      // Step 5: GET request to verify the updated field (after successful updates)
      cy.getSpecificationFields(bibSpecId).then((getResp) => {
        expect(getResp.status, 'Step 5: GET all fields after updates').to.eq(200);
        const updatedField = getResp.body.fields.find((field) => field.id === localFieldId);
        expect(updatedField, 'Updated field should exist in fields collection').to.exist;
        expect(updatedField.label, 'Field should have the last updated label').to.eq('1');
      });
    },
  );
});
