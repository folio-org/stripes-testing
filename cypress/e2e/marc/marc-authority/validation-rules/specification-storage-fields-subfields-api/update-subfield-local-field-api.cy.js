/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Update Subfield of Local field API', () => {
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

  const TAG = '901'; // Local field tag
  let user;
  let authSpecId;
  let localFieldId;
  let createdSubfieldId;

  const fieldPayload = {
    tag: TAG,
    label: 'AT Custom Field - Local Authority Subfield Test',
    url: 'http://www.example.org/field901.html',
    repeatable: false,
    required: false,
    deprecated: false,
  };

  before('Create user and setup local field with subfield', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        // Find the specification with profile 'authority'
        const authSpec = specs.find((s) => s.profile === 'authority');
        expect(authSpec, 'MARC authority specification exists').to.exist;
        authSpecId = authSpec.id;

        // Clean up any existing field with the same tag and create a new one
        cy.deleteSpecificationFieldByTag(authSpecId, fieldPayload.tag, false).then(() => {
          cy.createSpecificationField(authSpecId, fieldPayload).then((fieldResp) => {
            expect(fieldResp.status).to.eq(201);
            localFieldId = fieldResp.body.id;
            // Create the test subfield for the local field
            cy.createSpecificationFieldSubfield(localFieldId, {
              code: 'z',
              label: 'Test subfield for local field',
              repeatable: true,
              required: false,
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
      // Clean up the created field (this will also delete its subfields)
      if (localFieldId) {
        cy.deleteSpecificationFieldByTag(authSpecId, fieldPayload.tag, false);
      }

      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C511236 Update Subfield of Local field for MARC authority spec (API) (spitfire)',
    { tags: ['criticalPath', 'C511236', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Update all editable fields of the local field subfield
      const updatePayload1 = {
        code: 'a',
        label: 'Updated label of subfield',
        repeatable: true,
        required: true,
        deprecated: false,
      };

      cy.updateSpecificationSubfield(createdSubfieldId, updatePayload1).then((updateResp) => {
        expect(updateResp.status, 'Step 1: Update subfield - should succeed').to.eq(202);
        expect(updateResp.body.code).to.eq(updatePayload1.code);
        expect(updateResp.body.label).to.eq(updatePayload1.label);
        expect(updateResp.body.repeatable).to.eq(updatePayload1.repeatable);
        expect(updateResp.body.required).to.eq(updatePayload1.required);
        expect(updateResp.body.deprecated).to.eq(updatePayload1.deprecated);

        // Step 2: Verify the subfield was updated by getting all subfields
        cy.getSpecificationFieldSubfields(localFieldId).then((getResp) => {
          expect(getResp.status, 'Step 2: Get subfields after first update').to.eq(200);

          const updatedSubfield = getResp.body.subfields.find((sf) => sf.id === createdSubfieldId);
          expect(updatedSubfield, 'Updated subfield exists').to.exist;
          expect(updatedSubfield.code).to.eq(updatePayload1.code);
          expect(updatedSubfield.label).to.eq(updatePayload1.label);
          expect(updatedSubfield.repeatable).to.eq(updatePayload1.repeatable);
          expect(updatedSubfield.required).to.eq(updatePayload1.required);
          expect(updatedSubfield.deprecated).to.eq(updatePayload1.deprecated);
          expect(updatedSubfield.scope).to.eq('local');

          // Step 3: Update the subfield again with different values
          const updatePayload2 = {
            code: 'w',
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
            cy.getSpecificationFieldSubfields(localFieldId).then((getFinalResp) => {
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
              expect(finalUpdatedSubfield.scope).to.eq('local');
            });
          });
        });
      });
    },
  );
});
