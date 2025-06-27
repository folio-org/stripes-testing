/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import { STANDARD_FIELDS } from '../../../../support/constants';

describe('MARC Authority Validation Rules - Standard Fields', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
  ];

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let authoritySpecId;
  let standardField;

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        // Find the specification with profile 'authority'
        const authoritySpec = specs.find((s) => s.profile === 'authority');
        expect(authoritySpec, 'MARC authority specification exists').to.exist;
        authoritySpecId = authoritySpec.id;
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
    'C499843 Cannot delete a standard MARC field of authority spec (API)',
    { tags: ['smoke', 'C499843', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);
      // 1. Get all fields for the MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((response) => {
        expect(response.status).to.eq(200);
        // Find a standard field (e.g., 010, 100)
        standardField = STANDARD_FIELDS.map((tag) => findStandardField(response.body.fields, tag)).find(Boolean);
        expect(standardField, 'Standard field exists').to.exist;

        // 2. Attempt to delete the standard field
        cy.deleteSpecificationField(standardField.id, false).then((deleteResp) => {
          expect(deleteResp.status).to.eq(400);
          expect(deleteResp.body.errors[0].message).to.contain(
            'A standard scope field cannot be deleted.',
          );
        });

        // 3. Verify the field still exists
        cy.getSpecificationFields(authoritySpecId).then((getResp) => {
          expect(getResp.status).to.eq(200);
          const stillThere = getResp.body.fields.some((f) => f.id === standardField.id);
          expect(stillThere, 'Standard field was not deleted').to.be.true;
        });
      });
    },
  );
});
