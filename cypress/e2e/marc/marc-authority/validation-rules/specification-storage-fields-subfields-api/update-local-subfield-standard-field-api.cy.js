/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Update Local Subfield of Standard field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
    Permissions.specificationStorageUpdateSpecificationSubfield.gui,
  ];

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  const TAG = '090'; // Standard field tag
  let user;
  let authSpecId;
  let standardFieldId;
  let createdSubfieldId;
  let existingLocalSubfields = [];

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        // Find the specification with profile 'authority'
        const authSpec = specs.find((s) => s.profile === 'authority');
        expect(authSpec, 'MARC authority specification exists').to.exist;
        authSpecId = authSpec.id;

        // Get all fields for the MARC authority specification
        cy.getSpecificationFields(authSpecId).then((response) => {
          // Find a standard field
          const standardField = findStandardField(response.body.fields, TAG);
          expect(standardField, 'Standard field exists').to.exist;
          standardFieldId = standardField.id;
          cy.getSpecificationFieldSubfields(standardFieldId).then((subfieldsResp) => {
            expect(subfieldsResp.status).to.eq(200);
            // delete existing local subfields with code 'k' or 'w'
            existingLocalSubfields = subfieldsResp.body.subfields
              .filter((sf) => sf.scope === 'local')
              .filter((sf) => sf.code === 'k' || sf.code === 'w');
            if (existingLocalSubfields.length > 0) {
              existingLocalSubfields.forEach((sf) => {
                cy.deleteSpecificationFieldSubfield(sf.id);
              });
            }
            // Create the local subfield
            cy.createSpecificationFieldSubfield(standardFieldId, {
              code: 'l',
              label: 'Local subfield l',
              repeatable: true,
              required: true,
              deprecated: false,
            }).then((createResp) => {
              expect(createResp.status).to.eq(201);
              createdSubfieldId = createResp.body.id;
            });
          });
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
    if (user) {
      cy.getAdminToken();
      // Clean up any created subfields
      if (createdSubfieldId) {
        cy.deleteSpecificationFieldSubfield(createdSubfieldId);
      }
      // restore existing local subfields if any
      if (existingLocalSubfields.length > 0) {
        existingLocalSubfields.forEach((sf) => {
          cy.createSpecificationFieldSubfield(standardFieldId, {
            code: sf.code,
            label: sf.label,
            repeatable: sf.repeatable,
            required: sf.required,
            deprecated: sf.deprecated,
          });
        });
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C511235 Update Local Subfield of Standard field for MARC authority spec (API) (spitfire)',
    { tags: ['criticalPath', 'C511235', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);
      // Step 1: Update all editable fields of the local subfield
      const updatePayload1 = {
        code: 'k',
        label: 'Updated label of subfield',
        repeatable: true,
        required: true,
        deprecated: false,
      };

      cy.updateSpecificationSubfield(createdSubfieldId, updatePayload1).then((updateResp) => {
        expect(updateResp.status, 'Step 1: Update subfield - should succeed').to.eq(202);
        expect(updateResp.body.label).to.eq(updatePayload1.label);
        expect(updateResp.body.repeatable).to.eq(updatePayload1.repeatable);
        expect(updateResp.body.required).to.eq(updatePayload1.required);
        expect(updateResp.body.deprecated).to.eq(updatePayload1.deprecated);

        // Step 2: Verify the subfield was updated by getting all subfields
        cy.getSpecificationFieldSubfields(standardFieldId).then((getResp) => {
          expect(getResp.status, 'Step 2: Get subfields after first update').to.eq(200);

          const updatedSubfield = getResp.body.subfields.find((sf) => sf.id === createdSubfieldId);
          expect(updatedSubfield, 'Updated subfield exists').to.exist;
          expect(updatedSubfield.label).to.eq(updatePayload1.label);
          expect(updatedSubfield.repeatable).to.eq(updatePayload1.repeatable);
          expect(updatedSubfield.required).to.eq(updatePayload1.required);
          expect(updatedSubfield.deprecated).to.eq(updatePayload1.deprecated);

          // Step 3: Update the subfield again with different values
          const updatePayload2 = {
            code: 'w', // Change code to 'w'
            label: 'Updated label of subfield 2 case',
            repeatable: false,
            required: false,
            deprecated: true,
          };

          cy.updateSpecificationSubfield(createdSubfieldId, updatePayload2).then((updateResp2) => {
            expect(updateResp2.status, 'Step 3: Second update - should succeed').to.eq(202);
            expect(updateResp2.body.code).to.eq(updatePayload2.code);
            expect(updateResp2.body.label).to.eq(updatePayload2.label);
            expect(updateResp2.body.repeatable).to.eq(updatePayload2.repeatable);
            expect(updateResp2.body.required).to.eq(updatePayload2.required);
            expect(updateResp2.body.deprecated).to.eq(updatePayload2.deprecated);

            // Step 4: Verify the second update by getting all subfields again
            cy.getSpecificationFieldSubfields(standardFieldId).then((getFinalResp) => {
              expect(getFinalResp.status, 'Step 4: Get subfields after second update').to.eq(200);

              const finalUpdatedSubfield = getFinalResp.body.subfields.find(
                (sf) => sf.id === createdSubfieldId,
              );
              expect(finalUpdatedSubfield, 'Final updated subfield exists').to.exist;
              expect(finalUpdatedSubfield.code).to.eq(updatePayload2.code);
              expect(finalUpdatedSubfield.label).to.eq(updatePayload2.label);
              expect(finalUpdatedSubfield.repeatable).to.eq(updatePayload2.repeatable);
              expect(finalUpdatedSubfield.required).to.eq(updatePayload2.required);
              expect(finalUpdatedSubfield.deprecated).to.eq(updatePayload2.deprecated);
            });
          });
        });
      });
    },
  );
});
