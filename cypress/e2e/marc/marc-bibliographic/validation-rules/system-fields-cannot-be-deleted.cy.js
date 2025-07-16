/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - System Fields', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
  ];

  // System MARC fields for bibliographic specification
  const SYSTEM_FIELDS = ['000', '001', '005', '006', '007', '008', '245', '999'];
  function findSystemField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'system');
  }

  let user;
  let bibSpecId;
  let systemField;

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        // Find the specification with profile 'bibliographic'
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
      });
    });
  });

  it(
    'C499835 Cannot delete a system MARC field (API) (spitfire)',
    { tags: ['smoke', 'C499835', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);
      // 1. Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
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
        cy.getSpecificationFields(bibSpecId).then((getResp) => {
          expect(getResp.status).to.eq(200);
          const stillThere = getResp.body.fields.some((f) => f.id === systemField.id);
          expect(stillThere, 'System field was not deleted').to.be.true;
        });
      });
    },
  );

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });
});
