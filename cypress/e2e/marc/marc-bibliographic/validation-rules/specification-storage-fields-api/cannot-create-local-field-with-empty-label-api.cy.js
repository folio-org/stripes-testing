/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Empty Label API', () => {
  // User with both GET and POST permissions to create fields (but validation should prevent invalid requests)
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;

  const baseFieldPayload = {
    tag: '899',
    url: 'http://www.example.org/field100.html',
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

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490926 Cannot create Local Field with empty "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C490926', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Define test scenarios with empty label validation
      const emptyLabelScenarios = [
        {
          description: 'missing label field',
          payload: { ...baseFieldPayload },
          expectedError: "The 'label' field is required.",
        },
        {
          description: 'empty label field',
          payload: { ...baseFieldPayload, label: '' },
          expectedError: "The 'label' field is required.",
        },
        {
          description: 'space-only label field',
          payload: { ...baseFieldPayload, label: ' ' },
          expectedError: "The 'label' field is required.",
        },
      ];

      // Test each empty label scenario
      emptyLabelScenarios.forEach((scenario, index) => {
        cy.createSpecificationField(bibSpecId, scenario.payload, false).then((response) => {
          cy.log(`Step ${index + 1}: Testing ${scenario.description}`);

          expect(response.status).to.eq(400);
          expect(response.body.errors).to.exist;
          expect(response.body.errors).to.have.length.greaterThan(0);

          // Check for the specific label required error message
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
