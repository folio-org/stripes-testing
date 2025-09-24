/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Delete Local Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
  ];

  const TAG = '981';
  const AT_PREFIX = 'AT_C494364';

  let user;
  let authoritySpecId;
  let localField;

  const localFieldData = {
    tag: TAG,
    label: `${AT_PREFIX}_Test Local Field for Deletion`,
    url: 'http://www.example.org/field981.html',
    repeatable: true,
    required: false,
    deprecated: false,
    scope: 'local',
  };

  function validateApiResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
  }

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        // Find the specification with profile 'authority'
        const authoritySpec = specs.find((s) => s.profile === 'authority');
        expect(authoritySpec, 'MARC authority specification exists').to.exist;
        authoritySpecId = authoritySpec.id;

        // Clean up any existing local field with tag before test execution
        cy.getSpecificationFields(authoritySpecId).then((response) => {
          if (response.status === 200) {
            const existingLocalField = response.body.fields.find(
              (f) => f.tag === TAG && f.scope === 'local',
            );
            if (existingLocalField) {
              cy.deleteSpecificationField(existingLocalField.id, false);
            }
          }
        });

        // Create the test local field that will be deleted
        cy.createSpecificationField(authoritySpecId, localFieldData).then((createResp) => {
          expect(createResp.status).to.eq(201);
          localField = createResp.body;
          expect(localField.tag).to.eq(localFieldData.tag);
          expect(localField.scope).to.eq('local');
        });
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
    'C494364 Delete Local Field of MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C494364', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Send DELETE request to delete the local field
      cy.deleteSpecificationField(localField.id, true).then((deleteResp) => {
        validateApiResponse(deleteResp, 204);
      });

      // Step 2: Send GET request to verify the field is deleted
      cy.getSpecificationFields(authoritySpecId).then((getResp) => {
        const deletedField = getResp.body.fields.find(
          (field) => field.id === localField.id || field.tag === TAG,
        );
        expect(deletedField, 'Deleted field should not exist in response').to.be.undefined;
      });
    },
  );
});
