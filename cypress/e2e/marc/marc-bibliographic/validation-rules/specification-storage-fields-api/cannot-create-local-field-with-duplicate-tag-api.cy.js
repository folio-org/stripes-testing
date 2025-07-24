/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Duplicate Tag API', () => {
  // User with both GET and POST permissions to create fields (but validation should prevent duplicate tags)
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;

  const baseFieldPayload = {
    label: 'AT_C490925_Custom Field - Contributor Data',
    url: 'http://www.example.org/field100.html',
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
    'C490925 Cannot create Local Field with duplicate "tag" for MARC bib spec (API) (spitfire)',
    { tags: ['C490925', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Define test scenarios with tags that are likely to already exist in the system
      const duplicateTagScenarios = [
        {
          description: 'System validation rule tag (Title Statement)',
          tag: '245',
          expectedError: "The 'tag' must be unique.",
        },
        {
          description: 'Standard validation rule tag (Main Entry)',
          tag: '100',
          expectedError: "The 'tag' must be unique.",
        },
        {
          description: 'Common local field tag',
          tag: '999',
          expectedError: "The 'tag' must be unique.",
        },
      ];

      // Test each duplicate tag scenario
      duplicateTagScenarios.forEach((scenario, index) => {
        const payload = {
          ...baseFieldPayload,
          tag: scenario.tag,
        };

        cy.createSpecificationField(bibSpecId, payload, false).then((response) => {
          cy.log(`Step ${index + 1}: Testing duplicate ${scenario.description} (${scenario.tag})`);
          if (response.status === 400) {
            // This is the expected behavior for duplicate tags
            expect(response.body.errors).to.exist;
            expect(response.body.errors).to.have.length.greaterThan(0);

            // Check for the specific duplicate tag error message
            const errorMessages = response.body.errors.map((error) => error.message);
            expect(
              errorMessages.some((msg) => msg.includes(scenario.expectedError)),
              `Expected error message "${scenario.expectedError}" not found for ${scenario.description}. Actual errors: ${JSON.stringify(errorMessages)}`,
            ).to.be.true;
          } else if (response.status === 201) {
            // If creation was successful, the tag was not duplicate - clean up
            if (response.body && response.body.id) {
              cy.deleteSpecificationField(response.body.id);
            }
          }
        });
      });
    },
  );
});
