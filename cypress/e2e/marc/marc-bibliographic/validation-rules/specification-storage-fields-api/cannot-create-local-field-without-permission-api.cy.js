/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field without Permission API', () => {
  // User with only GET permission (missing POST permission)
  const limitedPermissions = [Permissions.specificationStorageGetSpecificationFields.gui];

  let user;
  let bibSpecId;
  const testTag = '889';

  const fieldPayload = {
    tag: testTag,
    label: 'AT_C490911_Custom Field - Contributor Data',
    url: 'http://www.example.org/field888.html',
    repeatable: true,
    required: true,
  };

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(limitedPermissions).then((createdUser) => {
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
    'C490911 Cannot create Local field for MARC bib spec without required permission (API) (spitfire)',
    { tags: ['C490911', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      cy.createSpecificationField(bibSpecId, fieldPayload, false).then((response) => {
        expect(response.status).to.eq(403);

        // Verify that response indicates access is denied
        // Following the pattern from test case requirements and other similar tests
        expect(response.body.errors).to.exist;
        expect(response.body.errors[0].message).to.include('Access Denied');
      });
    },
  );
});
