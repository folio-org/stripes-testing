/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Invalid Label Length API', () => {
  // User with both GET and POST permissions to create fields
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;
  const createdFieldIds = [];

  const baseFieldPayload = {
    url: 'http://www.example.org/field100.html',
    repeatable: true,
    required: false,
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
    'C490927 Cannot create Local Field with invalid "label" length for MARC bib spec (API) (spitfire)',
    { tags: ['C490927', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Define test scenarios with various label lengths
      const labelLengthScenarios = [
        {
          description: 'label with 351 characters (exceeds limit)',
          tag: '891',
          label:
            '351 character test Label validation during creation of validation rule for MARC bibliographic record via API (351 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 351 character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographicc',
          expectedStatus: 400,
          expectedError: "The 'label' field has exceeded 350 character limit",
        },
        {
          description: 'label with exactly 350 characters (valid)',
          tag: '892',
          label:
            '350 character test Label validation during creation of validation rule for MARC bibliographic record via API (350 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 35 0character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographic',
          expectedStatus: 201,
        },
        {
          description: 'label with 349 characters (valid)',
          tag: '893',
          label:
            '349 character test Label validation during creation of validation rule for MARC bibliographic record via API (350 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 35 0character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographi',
          expectedStatus: 201,
        },
        {
          description: 'label with 1 character (valid)',
          tag: '894',
          label: '1',
          expectedStatus: 201,
        },
      ];

      // Test each label length scenario
      labelLengthScenarios.forEach((scenario) => {
        const payload = {
          ...baseFieldPayload,
          tag: scenario.tag,
          label: scenario.label,
        };

        cy.createSpecificationField(bibSpecId, payload, false).then((response) => {
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
            expect(response.body.label).to.eq(scenario.label);

            // Store field ID for cleanup
            createdFieldIds.push(response.body.id);
          }
        });
      });
    },
  );
});
