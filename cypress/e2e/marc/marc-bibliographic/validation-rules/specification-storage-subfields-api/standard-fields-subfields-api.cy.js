/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('Specification Storage - Standard Fields Subfield API', () => {
  let user;
  let bibSpecId;
  let specificationFields;
  let createdSubfieldIds = [];
  const permissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  // Helper functions for better readability
  const findStandardFieldByTag = (tag) => {
    return specificationFields.find((field) => field.tag === tag && field.scope === 'standard');
  };

  const findLocalSubfieldByCode = (subfields, code) => {
    return subfields.find((sf) => sf.code === code && sf.scope === 'local');
  };

  const findStandardSubfieldByCode = (subfields, code) => {
    return subfields.find((sf) => sf.code === code && sf.scope === 'standard');
  };

  const filterSubfieldsByScope = (subfields, scope) => {
    return subfields.filter((sf) => sf.scope === scope);
  };

  const countSubfieldsByCode = (subfields, code) => {
    return subfields.filter((sf) => sf.code === code).length;
  };

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(permissions).then((createdUser) => {
      user = createdUser;
    });
    cy.getSpecificatoinIds().then((specs) => {
      const bibSpec = specs.find((s) => s.profile === 'bibliographic');
      expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
      bibSpecId = bibSpec.id;
    });
  });

  beforeEach('Setup user token and get specification fields', () => {
    cy.getUserToken(user.username, user.password);
    cy.getSpecificationFields(bibSpecId).then((response) => {
      expect(response.status).to.eq(200);
      specificationFields = response.body.fields;
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
    Users.deleteViaApi(user.userId);
  });

  it(
    'C499730 Create Subfield code of Standard field (repeatable, required, deprecated) for MARC bib spec (API) (spitfire)',
    { tags: ['C499730', 'criticalPath', 'spitfire'] },
    () => {
      // Find a standard field (e.g., 088 - Standard Field)
      const standardField = findStandardFieldByTag('088');
      expect(standardField, 'Standard field 088 exists').to.exist;

      // Precondition: Remove subfield 'j' if it already exists
      cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
        const existingSubfield = findLocalSubfieldByCode(getSubfieldsResp.body.subfields, 'j');
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
            const createdSubfield = findLocalSubfieldByCode(getSubfieldsResp.body.subfields, 'j');
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
    },
  );

  it(
    'C499732 Cannot create Subfield code of Standard field with duplicate "code" for MARC bib spec (API) (spitfire)',
    { tags: ['C499732', 'criticalPath', 'spitfire'] },
    () => {
      // Find a standard field (e.g., 100 - Main Entry--Personal Name)
      const standardField = findStandardFieldByTag('100');
      expect(standardField, 'Standard field 100 exists').to.exist;

      // Precondition: Remove subfield 'o' if it already exists
      cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
        const existingSubfield = findLocalSubfieldByCode(getSubfieldsResp.body.subfields, 'o');
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

          cy.createSpecificationFieldSubfield(standardField.id, duplicateLocalPayload, false).then(
            (duplicateResp) => {
              expect(duplicateResp.status).to.eq(400);
              expect(duplicateResp.body.errors[0].message).to.include("The 'code' must be unique.");
            },
          );
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
            const createdSubfield = findLocalSubfieldByCode(getSubfieldsResp.body.subfields, 'o');
            expect(createdSubfield, 'Created subfield o exists').to.exist;
            expect(createdSubfield.label).to.eq('Subfield code o name');

            // Verify standard subfields exist (should include 'a')
            const standardSubfields = filterSubfieldsByScope(
              getSubfieldsResp.body.subfields,
              'standard',
            );
            expect(standardSubfields.length, 'Standard subfields exist').to.be.greaterThan(0);

            // Verify standard subfield 'a' exists
            const standardSubfieldA = findStandardSubfieldByCode(
              getSubfieldsResp.body.subfields,
              'a',
            );
            expect(standardSubfieldA, 'Standard subfield a exists').to.exist;

            // Verify no duplicate 'o' or 'a' subfields were created
            const allOSubfields = countSubfieldsByCode(getSubfieldsResp.body.subfields, 'o');
            const allASubfields = countSubfieldsByCode(getSubfieldsResp.body.subfields, 'a');
            expect(allOSubfields, 'Only one subfield o exists').to.eq(1);
            expect(allASubfields, 'Only one subfield a exists').to.eq(1);
          });
        });
    },
  );

  it(
    'C499738 Create Subfield code of Standard field (not repeatable, not required, not deprecated) for MARC bib spec (API) (spitfire)',
    { tags: ['C499738', 'criticalPath', 'spitfire'] },
    () => {
      const subfieldCode = 'y';

      // Find a standard field (e.g., 100 - Main Entry--Personal Name)
      const standardField = findStandardFieldByTag('100');
      expect(standardField, 'Standard field 100 exists').to.exist;

      // Precondition: Remove subfield 'y' if it already exists
      cy.getSpecificationFieldSubfields(standardField.id)
        .then((getSubfieldsResp) => {
          const existingSubfield = findLocalSubfieldByCode(
            getSubfieldsResp.body.subfields,
            subfieldCode,
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
                const createdSubfield = findLocalSubfieldByCode(
                  getSubfieldsResp.body.subfields,
                  subfieldCode,
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
    },
  );

  it(
    'C499739 Create Subfield code of Standard field (repeatable, not required, not deprecated selected by default) for MARC bib spec (API) (spitfire)',
    { tags: ['C499739', 'criticalPath', 'spitfire'] },
    () => {
      const subfieldCode = 'z';

      // Find a standard field (e.g., 100 - Main Entry--Personal Name)
      const standardField = findStandardFieldByTag('100');
      expect(standardField, 'Standard field 100 exists').to.exist;

      // Precondition: Remove subfield 'z' if it already exists
      cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
        const existingSubfield = findLocalSubfieldByCode(
          getSubfieldsResp.body.subfields,
          subfieldCode,
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
            const createdSubfield = findLocalSubfieldByCode(
              getSubfieldsResp.body.subfields,
              subfieldCode,
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
    },
  );
});
