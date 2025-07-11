/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

describe('Specification Storage - Subfield API', () => {
  let user;
  let fieldId;
  let bibSpecId;
  let createdSubfieldId;
  const permissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const fieldPayload = {
    tag: '891',
    label: 'AT Custom Field - Subfield Test',
    url: 'http://www.example.org/field891.html',
    repeatable: false,
    required: false,
    deprecated: false,
  };

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(permissions).then((createdUser) => {
      user = createdUser;
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

  after('Cleanup: delete user', () => {
    cy.getAdminToken();
    cy.deleteSpecificationFieldByTag(bibSpecId, fieldPayload.tag, false);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C499708 Create Subfield code of Local field (not repeatable, not required, not deprecated) for MARC bib spec (API)',
    { tags: ['C499708', 'criticalPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);
      const subfieldPayload = {
        code: '4',
        label: 'label of code 4',
        repeatable: false,
        required: false,
        deprecated: false,
      };
      cy.createSpecificationFieldSubfield(fieldId, subfieldPayload)
        .then((subfieldResp) => {
          expect(subfieldResp.status).to.eq(201);
          const subfieldBody = subfieldResp.body;
          createdSubfieldId = subfieldBody.id;
          expect(subfieldBody).to.include({
            fieldId,
            code: '4',
            label: 'label of code 4',
            repeatable: false,
            required: false,
            deprecated: false,
            scope: 'local',
          });
        })
        .then(() => {
          cy.getSpecificationFieldSubfields(fieldId).then((getSubfieldsResp) => {
            expect(getSubfieldsResp.status).to.eq(200);
            const found = getSubfieldsResp.body.subfields.find((sf) => sf.id === createdSubfieldId);
            expect(found).to.exist;
            expect(found).to.include({
              fieldId,
              code: '4',
              label: 'label of code 4',
              repeatable: false,
              required: false,
              deprecated: false,
              scope: 'local',
            });
          });
        });
    },
  );
});
