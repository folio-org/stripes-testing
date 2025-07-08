/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

const createFieldPayload = {
  tag: '890',
  label: 'Custom Field - Contributor Data',
  url: 'http://www.example.org/field890.html',
  repeatable: false,
  required: false,
  deprecated: false,
};

const requiredPermissions = [
  Permissions.specificationStorageCreateSpecificationField.gui,
  Permissions.specificationStorageDeleteSpecificationField.gui,
  Permissions.specificationStorageGetSpecificationFields.gui,
];

describe('Specification Storage - Create Field API', () => {
  let user;
  let fieldId;
  let bibSpecId;

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

  after('Cleanup: delete field and user', () => {
    cy.getAdminToken();
    if (fieldId) {
      cy.deleteSpecificationField(fieldId);
    }
    if (user) {
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490917 Create Local Field (not repeatable, not required, not deprecated) for MARC bib spec (API)',
    { tags: ['C490917', 'criticalPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);
      cy.createSpecificationField(bibSpecId, createFieldPayload).then((response) => {
        expect(response.status).to.eq(201);
        const respBody = response.body;
        fieldId = respBody.id;
        expect(respBody).to.include({
          ...createFieldPayload,
          specificationId: bibSpecId,
          scope: 'local',
        });
      });
    },
  );
});
