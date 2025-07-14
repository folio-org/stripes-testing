/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

describe('Specification Storage - Field Indicators API', () => {
  let user;
  let limitedUser;
  let fieldId;
  let bibSpecId;
  const permissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
  ];

  // Limited permissions for negative testing (missing indicator creation permission)
  const limitedPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    // Note: Missing Permissions.specificationStorageCreateSpecificationFieldIndicator.gui
  ];

  const fieldPayload = {
    tag: '893',
    label: 'AT Custom Field - Indicator Test',
    url: 'http://www.example.org/field893.html',
    repeatable: false,
    required: false,
    deprecated: false,
  };

  before('Create users and fetch MARC bib specification', () => {
    cy.getAdminToken();
    // Create user with full permissions for setup
    cy.createTempUser(permissions).then((createdUser) => {
      user = createdUser;
    });
    // Create user with limited permissions for negative testing
    cy.createTempUser(limitedPermissions).then((createdLimitedUser) => {
      limitedUser = createdLimitedUser;
    });
    cy.getSpecificatoinIds()
      .then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
      })
      .then(() => {
        cy.deleteSpecificationFieldByTag(bibSpecId, fieldPayload.tag, false);
        cy.createSpecificationField(bibSpecId, fieldPayload).then((fieldResp) => {
          expect(fieldResp.status).to.eq(201);
          fieldId = fieldResp.body.id;
        });
      });
  });

  after('Cleanup: delete users and field', () => {
    cy.getAdminToken();
    cy.deleteSpecificationFieldByTag(bibSpecId, fieldPayload.tag, false);
    Users.deleteViaApi(user.userId);
    Users.deleteViaApi(limitedUser.userId);
  });

  it(
    'C499649 Cannot create indicator of Local field for MARC bib spec without required permission (API) (spitfire)',
    { tags: ['C499649', 'criticalPath', 'spitfire'] },
    () => {
      // Use the pre-created user with limited permissions
      cy.getUserToken(limitedUser.username, limitedUser.password);

      const indicatorPayload = {
        order: 1,
        label: 'Ind 1 name',
      };

      cy.createSpecificationFieldIndicator(fieldId, indicatorPayload, false).then((response) => {
        expect(response.status).to.eq(403);
        expect(response.body.errors[0].message).to.include('Access Denied');
      });
    },
  );
});
