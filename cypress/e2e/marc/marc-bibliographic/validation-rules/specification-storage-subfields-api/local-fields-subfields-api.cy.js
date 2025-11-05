/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('Specification Storage - Local Fields Subfield API', () => {
  let user;
  let fieldId;
  let bibSpecId;
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
    cy.getSpecificationIds()
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
    cy.deleteSpecificationFieldByTag(bibSpecId, fieldPayload.tag, false);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C499708 Create Subfield code of Local field (not repeatable, not required, not deprecated) for MARC bib spec (API) (spitfire)',
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
    'C499709 Create Subfield code of Local field (repeatable, not required, not deprecated selected by default) for MARC bib spec (API) (spitfire)',
    { tags: ['C499709', 'criticalPath', 'spitfire'] },
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

  it(
    'C499705 Cannot create Subfield code of Local field with empty "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C499705', 'criticalPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Test 1: Missing label field
      const payloadWithoutLabel = {
        code: '2',
      };
      cy.createSpecificationFieldSubfield(fieldId, payloadWithoutLabel, false).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.errors[0].message).to.include("The 'label' field is required.");
      });

      // Test 2: Empty label field
      const payloadWithEmptyLabel = {
        code: '2',
        label: '',
      };
      cy.createSpecificationFieldSubfield(fieldId, payloadWithEmptyLabel, false).then(
        (response) => {
          expect(response.status).to.eq(400);
          expect(response.body.errors[0].message).to.include("The 'label' field is required.");
        },
      );

      // Test 3: Label with only spaces
      const payloadWithSpaceLabel = {
        code: '2',
        label: ' ',
      };
      cy.createSpecificationFieldSubfield(fieldId, payloadWithSpaceLabel, false).then(
        (response) => {
          expect(response.status).to.eq(400);
          expect(response.body.errors[0].message).to.include("The 'label' field is required.");
        },
      );
    },
  );
});
