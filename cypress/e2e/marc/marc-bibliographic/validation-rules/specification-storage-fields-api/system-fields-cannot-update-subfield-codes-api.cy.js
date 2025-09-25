/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - System Fields Cannot Update Subfield Codes API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageUpdateSpecificationSubfield.gui,
  ];

  function findSystemField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'system');
  }

  let user;
  let bibSpecId;
  let systemField;
  let firstSubfield;

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        // Find the specification with profile 'bibliographic'
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
      });
    });
  });

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C510264 Cannot update Subfield code of System field for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C510264', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a system field (e.g., 999)
        systemField = findSystemField(response.body.fields, '999');
        expect(systemField, 'System field 999 exists').to.exist;

        // Get subfields for the system field
        cy.getSpecificationFieldSubfields(systemField.id).then((subfieldsResp) => {
          expect(subfieldsResp.status).to.eq(200);
          expect(subfieldsResp.body.subfields).to.have.length.greaterThan(0);

          // Get the first subfield
          firstSubfield = subfieldsResp.body.subfields[0];
          expect(firstSubfield, 'First subfield exists').to.exist;

          // Step 1: Attempt to update subfield code - should fail
          const updateCodePayload = {
            code: 'w',
            label: firstSubfield.label,
            repeatable: firstSubfield.repeatable,
            required: firstSubfield.required,
            deprecated: firstSubfield.deprecated,
          };

          cy.updateSpecificationSubfield(firstSubfield.id, updateCodePayload, false).then(
            (updateResp) => {
              expect(updateResp.status, 'Step 1: Update subfield code').to.eq(400);
              expect(updateResp.body.errors[0].message).to.contain(
                "The 'code' modification is not allowed for system scope.",
              );
            },
          );

          // Step 2: Attempt to update subfield label - should fail
          const updateLabelPayload = {
            code: firstSubfield.code,
            label: 'Undefined updated',
            repeatable: firstSubfield.repeatable,
            required: firstSubfield.required,
            deprecated: firstSubfield.deprecated,
          };

          cy.updateSpecificationSubfield(firstSubfield.id, updateLabelPayload, false).then(
            (updateResp) => {
              expect(updateResp.status, 'Step 2: Update subfield label').to.eq(400);
              expect(updateResp.body.errors[0].message).to.contain(
                "The 'label' modification is not allowed for system scope.",
              );
            },
          );

          // Step 3: Attempt to update subfield repeatable - should fail
          const updateRepeatablePayload = {
            code: firstSubfield.code,
            label: firstSubfield.label,
            repeatable: !firstSubfield.repeatable,
            required: firstSubfield.required,
            deprecated: firstSubfield.deprecated,
          };

          cy.updateSpecificationSubfield(firstSubfield.id, updateRepeatablePayload, false).then(
            (updateResp) => {
              expect(updateResp.status, 'Step 3: Update subfield repeatable').to.eq(400);
              expect(updateResp.body.errors[0].message).to.contain(
                "The 'repeatable' modification is not allowed for system scope.",
              );
            },
          );

          // Step 4: Attempt to update subfield required - should fail
          const updateRequiredPayload = {
            code: firstSubfield.code,
            label: firstSubfield.label,
            repeatable: firstSubfield.repeatable,
            required: !firstSubfield.required,
            deprecated: firstSubfield.deprecated,
          };

          cy.updateSpecificationSubfield(firstSubfield.id, updateRequiredPayload, false).then(
            (updateResp) => {
              expect(updateResp.status, 'Step 4: Update subfield required').to.eq(400);
              expect(updateResp.body.errors[0].message).to.contain(
                "The 'required' modification is not allowed for system scope.",
              );
            },
          );

          // Step 5: Attempt to update subfield deprecated - should fail
          const updateDeprecatedPayload = {
            code: firstSubfield.code,
            label: firstSubfield.label,
            repeatable: firstSubfield.repeatable,
            required: firstSubfield.required,
            deprecated: !firstSubfield.deprecated,
          };

          cy.updateSpecificationSubfield(firstSubfield.id, updateDeprecatedPayload, false).then(
            (updateResp) => {
              expect(updateResp.status, 'Step 5: Update subfield deprecated').to.eq(400);
              expect(updateResp.body.errors[0].message).to.contain(
                "The 'deprecated' modification is not allowed for system scope.",
              );
            },
          );

          // Step 6: Verify subfield data remains unchanged
          cy.getSpecificationFieldSubfields(systemField.id).then((verifyResp) => {
            expect(verifyResp.status, 'Step 6: Get subfields after update attempts').to.eq(200);

            // Find the same subfield in the response
            const unchangedSubfield = verifyResp.body.subfields.find(
              (sf) => sf.id === firstSubfield.id,
            );
            expect(unchangedSubfield, 'Unchanged subfield exists').to.exist;

            // Verify all properties remain the same
            expect(unchangedSubfield.code).to.eq(firstSubfield.code);
            expect(unchangedSubfield.label).to.eq(firstSubfield.label);
            expect(unchangedSubfield.repeatable).to.eq(firstSubfield.repeatable);
            expect(unchangedSubfield.required).to.eq(firstSubfield.required);
            expect(unchangedSubfield.deprecated).to.eq(firstSubfield.deprecated);
          });
        });
      });
    },
  );
});
