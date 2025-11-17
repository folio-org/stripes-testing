/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Subfields for Control Fields API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const TEST_CASE_ID = 'C499721';

  let user;
  let bibSpecId;
  const controlFieldIds = {};
  const createdFieldIds = []; // Track fields we created for cleanup

  before('Create user and setup control fields', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        // Helper function to create or get control fields
        const createOrGetControlField = (tag) => {
          const controlFieldData = {
            tag,
            label: `AT_${TEST_CASE_ID}_Control_Field_${tag}`,
            url: 'http://www.example.org/control-field.html',
            repeatable: false,
            required: false,
            deprecated: false,
          };

          return cy.getSpecificationFields(bibSpecId).then((fieldsResp) => {
            validateApiResponse(fieldsResp, 200);
            const existingField = fieldsResp.body.fields.find((f) => f.tag === tag);

            if (existingField) {
              // Use existing field (could be system, standard, or local)
              controlFieldIds[tag] = existingField.id;
              return existingField.id;
            } else {
              // Create new local field
              return cy.createSpecificationField(bibSpecId, controlFieldData).then((createResp) => {
                validateApiResponse(createResp, 201);
                controlFieldIds[tag] = createResp.body.id;
                createdFieldIds.push(createResp.body.id); // Track for cleanup
                return createResp.body.id;
              });
            }
          });
        };

        // Get or create all three control fields sequentially
        createOrGetControlField('002').then(() => {
          createOrGetControlField('004').then(() => {
            createOrGetControlField('009');
          });
        });
      });
    });
  });

  after('Delete created fields and test user', () => {
    if (createdFieldIds.length > 0) {
      cy.getAdminToken();
      createdFieldIds.forEach((fieldId) => {
        cy.deleteSpecificationField(fieldId, false);
      });
    }
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499721 Cannot create Subfield code for Local fields 002, 004, 009 of MARC bib spec (API) (spitfire)',
    { tags: ['C499721', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Attempt to create subfield for 002 field
      const firstSubfieldPayload = {
        code: 'a',
        label: 'Subfield a code name',
      };

      cy.createSpecificationFieldSubfield(controlFieldIds['002'], firstSubfieldPayload, false).then(
        (firstResp) => {
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
            expect(secondResp.status, 'Step 2: Cannot create subfield for 004 field').to.eq(400);
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
              expect(thirdResp.status, 'Step 3: Cannot create subfield for 009 field').to.eq(400);
              expect(thirdResp.body.errors[0].message).to.contain(
                'Cannot define subfields for 00X control fields.',
              );
            });
          });
        },
      );
    },
  );
});
