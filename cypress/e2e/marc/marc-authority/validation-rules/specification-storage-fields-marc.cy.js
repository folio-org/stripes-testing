/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

const createFieldPayload = {
  tag: '890',
  label: 'AT Custom Field - Contributor Data',
  url: 'http://www.example.org/field890.html',
};

const requiredPermissions = [
  Permissions.specificationStorageCreateSpecificationField.gui,
  Permissions.specificationStorageDeleteSpecificationField.gui,
  Permissions.specificationStorageGetSpecificationFields.gui,
  Permissions.specificationStorageUpdateSpecificationField.gui,
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
    'C494354 Create Local Field (not repeatable, not required, not deprecated) for MARC authority spec (API) (spitfire)',
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

  it(
    'C494355 Create Local Field (not repeatable, not required, not deprecated selected as default) for MARC authority spec (API) (spitfire)',
    { tags: ['C494355', 'criticalPath', 'spitfire'] },
    () => {
      const payload = {
        ...createFieldPayload,
      };
      cy.getUserToken(user.username, user.password);
      cy.createSpecificationField(authSpecId, payload).then((response) => {
        expect(response.status).to.eq(201);
        const respBody = response.body;
        fieldId = respBody.id;
        expect(respBody).to.include({
          ...payload,
          repeatable: true,
          required: false,
          deprecated: false,
          specificationId: authSpecId,
          scope: 'local',
        });
      });
    },
  );

  it(
    'C494362 Update Local Field for MARC authority spec (API) (spitfire)',
    { tags: ['C494362', 'criticalPath', 'spitfire'] },
    () => {
      // Step 1: Create a Local MARC field with all flags true
      const initialPayload = {
        ...createFieldPayload,
        tag: '898',
        repeatable: true,
        required: true,
        deprecated: true,
      };
      cy.getUserToken(user.username, user.password);
      cy.createSpecificationField(authSpecId, initialPayload).then((response) => {
        expect(response.status).to.eq(201);
        const respBody = response.body;
        fieldId = respBody.id;
        expect(respBody).to.include({
          ...initialPayload,
          specificationId: authSpecId,
          scope: 'local',
        });

        // Step 2: Update the field with all flags false
        const updatePayload1 = {
          tag: '899',
          label: 'Field name with updates made by user',
          url: 'http://www.example.org/updated',
          repeatable: false,
          required: false,
          deprecated: false,
        };
        cy.updateSpecificationField(fieldId, updatePayload1).then((updateResp1) => {
          expect(updateResp1.status).to.eq(202);
          expect(updateResp1.body).to.include({
            ...updatePayload1,
            specificationId: authSpecId,
            scope: 'local',
          });

          // Step 3: GET all fields and verify the update
          cy.getSpecificationFields(authSpecId).then((getResp1) => {
            expect(getResp1.status).to.eq(200);
            const updatedField1 = getResp1.body.fields.find((f) => f.id === fieldId);
            expect(updatedField1).to.include({
              ...updatePayload1,
              specificationId: authSpecId,
              scope: 'local',
            });

            // Step 4: Update the field again with all flags true and new values
            const updatePayload2 = {
              tag: '900',
              label: 'Field name with updates made by user #2',
              url: 'http://www.example.org/updated2',
              repeatable: true,
              required: true,
              deprecated: true,
            };
            cy.updateSpecificationField(fieldId, updatePayload2).then((updateResp2) => {
              expect(updateResp2.status).to.eq(202);
              expect(updateResp2.body).to.include({
                ...updatePayload2,
                specificationId: authSpecId,
                scope: 'local',
              });

              // Step 5: GET all fields and verify the second update
              cy.getSpecificationFields(authSpecId).then((getResp2) => {
                expect(getResp2.status).to.eq(200);
                const updatedField2 = getResp2.body.fields.find((f) => f.id === fieldId);
                expect(updatedField2).to.include({
                  ...updatePayload2,
                  specificationId: authSpecId,
                  scope: 'local',
                });
              });
            });
          });
        });
      });
    },
  );
});
