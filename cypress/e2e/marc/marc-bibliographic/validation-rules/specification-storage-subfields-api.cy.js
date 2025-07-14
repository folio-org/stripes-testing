/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

describe('Specification Storage - Subfield API', () => {
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

  it(
    'C499730 Create Subfield code of Standard field (repeatable, required, deprecated) for MARC bib spec (API) (spitfire)',
    { tags: ['C499730', 'criticalPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bibliographic specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., 088 - Standard Field)
        const standardField = response.body.fields.find(
          (field) => field.tag === '088' && field.scope === 'standard',
        );
        expect(standardField, 'Standard field 088 exists').to.exist;

        // Precondition: Remove subfield 'j' if it already exists
        cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
          const existingSubfield = getSubfieldsResp.body.subfields.find(
            (sf) => sf.code === 'j' && sf.scope === 'local',
          );
          if (existingSubfield) {
            cy.deleteSpecificationFieldSubfield(existingSubfield.id);
          }
        });

        const subfieldPayload = {
          code: 'j',
          label: 'Added j subfield name',
          repeatable: true,
          required: true,
          deprecated: true,
        };

        cy.createSpecificationFieldSubfield(standardField.id, subfieldPayload)
          .then((subfieldResp) => {
            expect(subfieldResp.status).to.eq(201);
            const subfieldBody = subfieldResp.body;
            const createdSubfieldId = subfieldBody.id;
            createdSubfieldIds.push(createdSubfieldId);
            expect(subfieldBody).to.include({
              fieldId: standardField.id,
              code: 'j',
              label: 'Added j subfield name',
              repeatable: true,
              required: true,
              deprecated: true,
              scope: 'local',
            });
          })
          .then(() => {
            cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
              expect(getSubfieldsResp.status).to.eq(200);

              // Verify created subfield exists
              const createdSubfield = getSubfieldsResp.body.subfields.find(
                (sf) => sf.code === 'j' && sf.scope === 'local',
              );
              expect(createdSubfield, 'Created subfield exists').to.exist;
              expect(createdSubfield).to.include({
                fieldId: standardField.id,
                code: 'j',
                label: 'Added j subfield name',
                repeatable: true,
                required: true,
                deprecated: true,
                scope: 'local',
              });
            });
          });
      });
    },
  );

  it(
    'C499732 Cannot create Subfield code of Standard field with duplicate "code" for MARC bib spec (API) (spitfire)',
    { tags: ['C499732', 'criticalPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bibliographic specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., 100 - Main Entry--Personal Name)
        const standardField = response.body.fields.find(
          (field) => field.tag === '100' && field.scope === 'standard',
        );
        expect(standardField, 'Standard field 100 exists').to.exist;

        // Precondition: Remove subfield 'o' if it already exists
        cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
          const existingSubfield = getSubfieldsResp.body.subfields.find(
            (sf) => sf.code === 'o' && sf.scope === 'local',
          );
          if (existingSubfield) {
            cy.deleteSpecificationFieldSubfield(existingSubfield.id);
          }
        });

        // Step 1: Create a subfield with unique code
        const subfieldPayload = {
          code: 'o',
          label: 'Subfield code o name',
        };

        cy.createSpecificationFieldSubfield(standardField.id, subfieldPayload)
          .then((subfieldResp) => {
            expect(subfieldResp.status).to.eq(201);
            const createdSubfieldId = subfieldResp.body.id;
            createdSubfieldIds.push(createdSubfieldId);
            expect(subfieldResp.body).to.include({
              fieldId: standardField.id,
              code: 'o',
              label: 'Subfield code o name',
              scope: 'local',
            });
          })
          .then(() => {
            // Step 2: Attempt to create duplicate with same local code
            const duplicateLocalPayload = {
              code: 'o',
              label: 'Subfield code o name duplicate',
            };

            cy.createSpecificationFieldSubfield(
              standardField.id,
              duplicateLocalPayload,
              false,
            ).then((duplicateResp) => {
              expect(duplicateResp.status).to.eq(400);
              expect(duplicateResp.body.errors[0].message).to.include("The 'code' must be unique.");
            });
          })
          .then(() => {
            // Step 3: Attempt to create duplicate with existing standard code (e.g., 'a')
            const duplicateStandardPayload = {
              code: 'a',
              label: 'Subfield code a name duplicate',
            };

            cy.createSpecificationFieldSubfield(
              standardField.id,
              duplicateStandardPayload,
              false,
            ).then((duplicateStandardResp) => {
              expect(duplicateStandardResp.status).to.eq(400);
              expect(duplicateStandardResp.body.errors[0].message).to.include(
                "The 'code' must be unique.",
              );
            });
          })
          .then(() => {
            // Step 4: Verify all subfields exist (standard + created)
            cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
              expect(getSubfieldsResp.status).to.eq(200);

              // Verify our created subfield exists
              const createdSubfield = getSubfieldsResp.body.subfields.find(
                (sf) => sf.code === 'o' && sf.scope === 'local',
              );
              expect(createdSubfield, 'Created subfield o exists').to.exist;
              expect(createdSubfield.label).to.eq('Subfield code o name');

              // Verify standard subfields exist (should include 'a')
              const standardSubfields = getSubfieldsResp.body.subfields.filter(
                (sf) => sf.scope === 'standard',
              );
              expect(standardSubfields.length, 'Standard subfields exist').to.be.greaterThan(0);

              // Verify standard subfield 'a' exists
              const standardSubfieldA = standardSubfields.find((sf) => sf.code === 'a');
              expect(standardSubfieldA, 'Standard subfield a exists').to.exist;

              // Verify no duplicate 'o' or 'a' subfields were created
              const allOSubfields = getSubfieldsResp.body.subfields.filter((sf) => sf.code === 'o');
              const allASubfields = getSubfieldsResp.body.subfields.filter((sf) => sf.code === 'a');
              expect(allOSubfields.length, 'Only one subfield o exists').to.eq(1);
              expect(allASubfields.length, 'Only one subfield a exists').to.eq(1);
            });
          });
      });
    },
  );

  it(
    'C499738 Create Subfield code of Standard field (not repeatable, not required, not deprecated) for MARC bib spec (API) (spitfire)',
    { tags: ['C499738', 'criticalPath', 'spitfire'] },
    () => {
      const subfieldCode = 'y';
      // Remove subfield if it exists to prevent conflicts
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bibliographic specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., 100 - Main Entry--Personal Name)
        const standardField = response.body.fields.find(
          (field) => field.tag === '100' && field.scope === 'standard',
        );
        expect(standardField, 'Standard field 100 exists').to.exist;

        // Precondition: Remove subfield 'y' if it already exists
        cy.getSpecificationFieldSubfields(standardField.id)
          .then((getSubfieldsResp) => {
            const existingSubfield = getSubfieldsResp.body.subfields.find(
              (sf) => sf.code === subfieldCode && sf.scope === 'local',
            );
            if (existingSubfield) {
              cy.deleteSpecificationFieldSubfield(existingSubfield.id);
            }
          })
          .then(() => {
            // Step 1: Create a subfield with unique code

            const subfieldPayload = {
              code: subfieldCode,
              label: `Added ${subfieldCode} subfield name`,
              repeatable: false,
              required: false,
              deprecated: false,
            };

            cy.createSpecificationFieldSubfield(standardField.id, subfieldPayload)
              .then((subfieldResp) => {
                expect(subfieldResp.status).to.eq(201);
                const subfieldBody = subfieldResp.body;
                const createdSubfieldId = subfieldBody.id;
                createdSubfieldIds.push(createdSubfieldId);
                expect(subfieldBody).to.include({
                  fieldId: standardField.id,
                  code: subfieldCode,
                  label: `Added ${subfieldCode} subfield name`,
                  repeatable: false,
                  required: false,
                  deprecated: false,
                  scope: 'local',
                });
              })
              .then(() => {
                cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
                  expect(getSubfieldsResp.status).to.eq(200);

                  // Verify created subfield exists
                  const createdSubfield = getSubfieldsResp.body.subfields.find(
                    (sf) => sf.code === subfieldCode && sf.scope === 'local',
                  );
                  expect(createdSubfield, 'Created subfield exists').to.exist;
                  expect(createdSubfield).to.include({
                    fieldId: standardField.id,
                    code: subfieldCode,
                    label: `Added ${subfieldCode} subfield name`,
                    repeatable: false,
                    required: false,
                    deprecated: false,
                    scope: 'local',
                  });
                });
              });
          });
      });
    },
  );

  it(
    'C499739 Create Subfield code of Standard field (repeatable, not required, not deprecated selected by default) for MARC bib spec (API) (spitfire)',
    { tags: ['C499739', 'criticalPath', 'spitfire'] },
    () => {
      const subfieldCode = 'z';
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bibliographic specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., 100 - Main Entry--Personal Name)
        const standardField = response.body.fields.find(
          (field) => field.tag === '100' && field.scope === 'standard',
        );
        expect(standardField, 'Standard field 100 exists').to.exist;

        // Precondition: Remove subfield 'z' if it already exists
        cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
          const existingSubfield = getSubfieldsResp.body.subfields.find(
            (sf) => sf.code === subfieldCode && sf.scope === 'local',
          );
          if (existingSubfield) {
            cy.deleteSpecificationFieldSubfield(existingSubfield.id);
          }
        });

        // Create subfield with minimal payload (only required fields)
        const subfieldPayload = {
          code: subfieldCode,
          label: `Added ${subfieldCode} subfield name`,
        };

        cy.createSpecificationFieldSubfield(standardField.id, subfieldPayload)
          .then((subfieldResp) => {
            expect(subfieldResp.status).to.eq(201);
            const subfieldBody = subfieldResp.body;
            const createdSubfieldId = subfieldBody.id;
            createdSubfieldIds.push(createdSubfieldId);

            // Verify default values are applied
            expect(subfieldBody).to.include({
              fieldId: standardField.id,
              code: subfieldCode,
              label: `Added ${subfieldCode} subfield name`,
              repeatable: true,
              required: false,
              deprecated: false,
              scope: 'local',
            });
          })
          .then(() => {
            cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
              expect(getSubfieldsResp.status).to.eq(200);

              // Verify created subfield exists with default values
              const createdSubfield = getSubfieldsResp.body.subfields.find(
                (sf) => sf.code === subfieldCode && sf.scope === 'local',
              );
              expect(createdSubfield, 'Created subfield exists').to.exist;
              expect(createdSubfield).to.include({
                fieldId: standardField.id,
                code: subfieldCode,
                label: `Added ${subfieldCode} subfield name`,
                repeatable: true,
                required: false,
                deprecated: false,
                scope: 'local',
              });
            });
          });
      });
    },
  );
});
