/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

const createFieldPayload = {
  tag: '890',
  label: 'Custom Field - Contributor Data',
  url: 'http://www.example.org/field890.html',
};

const requiredPermissions = [
  Permissions.specificationStorageCreateSpecificationField.gui,
  Permissions.specificationStorageDeleteSpecificationField.gui,
  Permissions.specificationStorageGetSpecificationFields.gui,
];

describe('Specification Storage - Create Field API', () => {
  let user;
  let fieldId;
  let authSpecId;

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        const authSpec = specs.find((s) => s.profile === 'authority');
        expect(authSpec, 'MARC authority specification exists').to.exist;
        authSpecId = authSpec.id;
      });
    });
  });

  afterEach('Cleanup: delete field', () => {
    cy.getAdminToken();
    if (fieldId) {
      cy.deleteSpecificationField(fieldId, false);
    }
  });

  after('Cleanup: delete user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C494354 Create Local Field (not repeatable, not required, not deprecated) for MARC authority spec (API)',
    { tags: ['C494354', 'criticalPath', 'spitfire'] },
    () => {
      const payload = {
        ...createFieldPayload,
        repeatable: false,
        required: false,
        deprecated: false,
      };
      cy.getUserToken(user.username, user.password);
      cy.createSpecificationField(authSpecId, payload).then((response) => {
        expect(response.status).to.eq(201);
        const respBody = response.body;
        fieldId = respBody.id;
        expect(respBody).to.include({
          ...payload,
          specificationId: authSpecId,
          scope: 'local',
        });
      });
    },
  );
});
