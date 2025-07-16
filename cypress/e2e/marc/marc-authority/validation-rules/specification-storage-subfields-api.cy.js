/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

describe('Specification Storage - Subfield API for MARC Authority', () => {
  let user;
  let fieldId;
  let authSpecId;
  let createdSubfieldIds = [];
  const permissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const fieldPayload = {
    tag: '892',
    label: 'AT Custom Field - Authority Subfield Test',
    url: 'http://www.example.org/field892.html',
    repeatable: false,
    required: false,
    deprecated: false,
  };

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(permissions).then((createdUser) => {
      user = createdUser;
    });
    cy.getSpecificatoinIds()
      .then((specs) => {
        const authSpec = specs.find((s) => s.profile === 'authority');
        expect(authSpec, 'MARC authority specification exists').to.exist;
        authSpecId = authSpec.id;
      })
      .then(() => {
        cy.deleteSpecificationFieldByTag(authSpecId, fieldPayload.tag, false);
        cy.createSpecificationField(authSpecId, fieldPayload).then((fieldResp) => {
          expect(fieldResp.status).to.eq(201);
          fieldId = fieldResp.body.id;
        });
      });
  });

  afterEach('Clean up created subfields', () => {
    if (createdSubfieldIds.length > 0) {
      cy.getAdminToken();
      createdSubfieldIds.forEach((subfieldId) => {
        cy.deleteSpecificationFieldSubfield(subfieldId);
      });
      createdSubfieldIds = [];
    }
  });

  after('Cleanup: delete user and subfields', () => {
    cy.getAdminToken();
    // Clean up all created subfields
    if (createdSubfieldIds.length > 0) {
      createdSubfieldIds.forEach((subfieldId) => {
        cy.deleteSpecificationFieldSubfield(subfieldId);
      });
    }
    cy.deleteSpecificationFieldByTag(authSpecId, fieldPayload.tag, false);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C499711 Create Subfield Code of Local Field (not repeatable, not required, not deprecated) for MARC authority spec (API) (spitfire)',
    { tags: ['C499711', 'criticalPath', 'spitfire'] },
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
          const createdSubfieldId = subfieldBody.id;
          createdSubfieldIds.push(createdSubfieldId);
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
            const found = getSubfieldsResp.body.subfields.find(
              (sf) => sf.id === createdSubfieldIds[createdSubfieldIds.length - 1],
            );
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

  it(
    'C499712 Create Subfield Code of Local Field (repeatable, not required, not deprecated selected by default) for MARC authority spec (API) (spitfire)',
    { tags: ['C499712', 'criticalPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);
      const subfieldPayload = {
        code: '5',
        label: 'label of code 5',
      };
      cy.createSpecificationFieldSubfield(fieldId, subfieldPayload)
        .then((subfieldResp) => {
          expect(subfieldResp.status).to.eq(201);
          const subfieldBody = subfieldResp.body;
          const createdSubfieldId = subfieldBody.id;
          createdSubfieldIds.push(createdSubfieldId);
          expect(subfieldBody).to.include({
            fieldId,
            code: '5',
            label: 'label of code 5',
            repeatable: true,
            required: false,
            deprecated: false,
            scope: 'local',
          });
        })
        .then(() => {
          cy.getSpecificationFieldSubfields(fieldId).then((getSubfieldsResp) => {
            expect(getSubfieldsResp.status).to.eq(200);
            const found = getSubfieldsResp.body.subfields.find(
              (sf) => sf.id === createdSubfieldIds[createdSubfieldIds.length - 1],
            );
            expect(found).to.exist;
            expect(found).to.include({
              fieldId,
              code: '5',
              label: 'label of code 5',
              repeatable: true,
              required: false,
              deprecated: false,
              scope: 'local',
            });
          });
        });
    },
  );
});
