/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('Specification Storage - Subfield API for MARC Authority', () => {
  let user;
  let fieldId;
  let authSpecId;
  let createdSubfieldIds = [];
  const permissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
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
    cy.getSpecificationIds()
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

  it(
    'C499710 Create Subfield Code of Local Field (repeatable, required, deprecated) for MARC authority spec (API) (spitfire)',
    { tags: ['C499710', 'criticalPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);
      const subfieldPayload = {
        code: '3',
        label: 'label of code 3',
        repeatable: true,
        required: true,
        deprecated: true,
      };
      cy.createSpecificationFieldSubfield(fieldId, subfieldPayload)
        .then((subfieldResp) => {
          expect(subfieldResp.status).to.eq(201);
          const subfieldBody = subfieldResp.body;
          const createdSubfieldId = subfieldBody.id;
          createdSubfieldIds.push(createdSubfieldId);

          // Verify response body structure
          expect(subfieldBody).to.include({
            fieldId,
            ...subfieldPayload,
            scope: 'local',
          });
          expect(subfieldBody.id, 'Subfield has ID').to.exist;
          expect(subfieldBody.metadata, 'Subfield has metadata').to.exist;
        })
        .then(() => {
          // Step 2: Verify the subfield was created via GET request
          cy.getSpecificationFieldSubfields(fieldId).then((getSubfieldsResp) => {
            expect(getSubfieldsResp.status).to.eq(200);

            // Find the created subfield
            const found = getSubfieldsResp.body.subfields.find(
              (sf) => sf.id === createdSubfieldIds[createdSubfieldIds.length - 1],
            );
            expect(found, 'Created subfield found in response').to.exist;
            expect(found).to.include({
              fieldId,
              ...subfieldPayload,
              scope: 'local',
            });
          });
        });
    },
  );

  it(
    'C506706 Cannot create Subfields for Local Field 002, 004, 009 of MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C506706', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);
      const controlFieldIds = {};

      // First, create the three control fields (002, 004, 009)
      const createControlField = (tag) => {
        const controlFieldData = {
          tag,
          label: `AT_C506706_Control Field ${tag}`,
          url: 'http://www.example.org/control-field.html',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        return cy
          .getSpecificationFields(authSpecId)
          .then((fieldsResp) => {
            expect(fieldsResp.status).to.eq(200);
            const existingField = fieldsResp.body.fields.find(
              (f) => f.tag === tag && f.scope === 'local',
            );
            if (existingField) {
              cy.deleteSpecificationField(existingField.id, false);
            }
          })
          .then(() => {
            return cy.createSpecificationField(authSpecId, controlFieldData).then((createResp) => {
              expect(createResp.status).to.eq(201);
              controlFieldIds[tag] = createResp.body.id;
              return createResp.body.id;
            });
          });
      };

      // Create all three control fields sequentially
      createControlField('002').then(() => {
        createControlField('004').then(() => {
          createControlField('009').then(() => {
            // Step 1: Attempt to create subfield for 002 field
            const firstSubfieldPayload = {
              code: 'a',
              label: 'Subfield a code name',
            };

            cy.createSpecificationFieldSubfield(
              controlFieldIds['002'],
              firstSubfieldPayload,
              false,
            ).then((firstResp) => {
              expect(firstResp.status, 'Step 1: Cannot create subfield for 002 field').to.eq(400);
              expect(firstResp.body.errors[0].message).to.contain(
                'Cannot define subfields for 00X control fields.',
              );

              // Step 2: Attempt to create subfield for 004 field
              const secondSubfieldPayload = {
                code: 'b',
                label: 'Subfield b code name',
              };

              cy.createSpecificationFieldSubfield(
                controlFieldIds['004'],
                secondSubfieldPayload,
                false,
              ).then((secondResp) => {
                expect(secondResp.status, 'Step 2: Cannot create subfield for 004 field').to.eq(
                  400,
                );
                expect(secondResp.body.errors[0].message).to.contain(
                  'Cannot define subfields for 00X control fields.',
                );

                // Step 3: Attempt to create subfield for 009 field
                const thirdSubfieldPayload = {
                  code: 'd',
                  label: 'Subfield d code name',
                };

                cy.createSpecificationFieldSubfield(
                  controlFieldIds['009'],
                  thirdSubfieldPayload,
                  false,
                ).then((thirdResp) => {
                  expect(thirdResp.status, 'Step 3: Cannot create subfield for 009 field').to.eq(
                    400,
                  );
                  expect(thirdResp.body.errors[0].message).to.contain(
                    'Cannot define subfields for 00X control fields.',
                  );

                  // Cleanup: Delete all created control fields
                  cy.deleteSpecificationField(controlFieldIds['002'], true);
                  cy.deleteSpecificationField(controlFieldIds['004'], true);
                  cy.deleteSpecificationField(controlFieldIds['009'], true);
                });
              });
            });
          });
        });
      });
    },
  );
});
