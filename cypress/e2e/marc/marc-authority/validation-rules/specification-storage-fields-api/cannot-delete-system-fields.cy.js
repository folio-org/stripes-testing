/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import { SYSTEM_FIELDS } from '../../../../../support/constants';

describe('MARC Authority Validation Rules - System Fields', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
  ];

  function findSystemField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'system');
  }

  let user;
  let authoritySpecId;
  let systemField;

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
    'C499842 Cannot delete a system MARC field of authority spec (API) (spitfire)',
    { tags: ['smoke', 'C499842', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);
      // 1. Get all fields for the MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((response) => {
        expect(response.status).to.eq(200);
        // Find a system field (e.g., 001)
        systemField = SYSTEM_FIELDS.map((tag) => findSystemField(response.body.fields, tag)).find(
          Boolean,
        );
        expect(systemField, 'System field exists').to.exist;

        // 2. Attempt to delete the system field
        cy.deleteSpecificationField(systemField.id, false).then((deleteResp) => {
          expect(deleteResp.status).to.eq(400);
          expect(deleteResp.body.errors[0].message).to.contain(
            'A system scope field cannot be deleted.',
          );
        });

        // 3. Verify the field still exists
        cy.getSpecificationFields(authoritySpecId).then((getResp) => {
          expect(getResp.status).to.eq(200);
          const stillThere = getResp.body.fields.some((f) => f.id === systemField.id);
          expect(stillThere, 'System field was not deleted').to.be.true;
        });
      });
    },
  );
});
