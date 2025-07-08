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

  afterEach('Cleanup: delete field', () => {
    cy.getAdminToken();
    if (fieldId) {
      cy.deleteSpecificationField(fieldId);
    }
  });

  after('Cleanup: delete user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C490917 Create Local Field (not repeatable, not required, not deprecated) for MARC bib spec (API)',
    { tags: ['C490917', 'criticalPath', 'spitfire'] },
    () => {
      const payload = {
        ...createFieldPayload,
        repeatable: false,
        required: false,
        deprecated: false,
      };
      cy.getUserToken(user.username, user.password);
      cy.createSpecificationField(bibSpecId, payload).then((response) => {
        expect(response.status).to.eq(201);
        const respBody = response.body;
        fieldId = respBody.id;
        expect(respBody).to.include({
          ...payload,
          specificationId: bibSpecId,
          scope: 'local',
        });
      });
    },
  );

  it(
    'C490918 Create Local Field (not repeatable, not required, not deprecated selected as default) for MARC bib spec (API)',
    { tags: ['C490918', 'criticalPath', 'spitfire'] },
    () => {
      const payload = {
        ...createFieldPayload,
      };
      cy.getUserToken(user.username, user.password);
      cy.createSpecificationField(bibSpecId, payload).then((response) => {
        expect(response.status).to.eq(201);
        const respBody = response.body;
        fieldId = respBody.id;
        expect(respBody).to.include({
          ...payload,
          repeatable: true,
          required: false,
          deprecated: false,
          specificationId: bibSpecId,
          scope: 'local',
        });
      });
    },
  );
});
