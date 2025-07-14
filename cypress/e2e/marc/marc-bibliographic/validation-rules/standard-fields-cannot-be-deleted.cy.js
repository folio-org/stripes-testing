/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Standard Fields', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
  ];

  // Standard MARC fields for bibliographic specification
  const STANDARD_FIELDS = ['010', '100', '600', '650', '700', '800'];
  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;

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

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499836 Cannot delete a standard MARC field (API) (spitfire)',
    { tags: ['smoke', 'C499836', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);
      // 1. Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);
        // Find a standard field (e.g., 100)
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
        cy.getSpecificationFields(bibSpecId).then((getResp) => {
          expect(getResp.status).to.eq(200);
          const stillThere = getResp.body.fields.some((f) => f.id === standardField.id);
          expect(stillThere, 'Standard field was not deleted').to.be.true;
        });
      });
    },
  );
});
