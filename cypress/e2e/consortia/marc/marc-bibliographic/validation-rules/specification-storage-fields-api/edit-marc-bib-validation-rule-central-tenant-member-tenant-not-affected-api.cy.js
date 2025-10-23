/* eslint-disable no-unused-expressions */
import Affiliations from '../../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../../support/dictionary/permissions';
import Users from '../../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findStandardField,
  findSubfieldByCodeAndScope,
  validateApiResponse,
} from '../../../../../../support/api/specifications-helper';

describe('Consortia', () => {
  describe('MARC', () => {
    describe('MARC Bibliographic', () => {
      describe('Validation Rules', () => {
        let memberUser; // User B - Member tenant with read-only permissions
        let centralBibSpecId;
        let memberBibSpecId;
        let centralField100;
        let memberField100;
        let centralSubfield100a;
        let memberSubfield100a;

        const STANDARD_FIELD_TAG = '100'; // Standard field for testing

        // Test data for updates
        const updatedFieldData = {
          tag: '100',
          label: 'Main Entry - Personal Name',
          url: 'https://www.loc.gov/marc/bibliographic/bd100/UPDATED.html',
          required: true,
          repeatable: false,
          deprecated: false,
        };

        const updatedSubfieldData = {
          code: 'a',
          label: 'Personal name', // Keep original label for standard subfield
          repeatable: false,
          required: true, // Updated required flag (only allowed change for standard subfields)
          deprecated: false,
        };

        // Original data for comparison (to verify member tenant unchanged)
        let originalMemberFieldData;
        let originalMemberSubfieldData;

        // Original central data for restoration
        let originalCentralFieldData;
        let originalCentralSubfieldData;

        // Member tenant permissions (read-only)
        const memberPermissions = [
          Permissions.specificationStorageSpecificationCollectionGet.gui,
          Permissions.specificationStorageGetSpecificationFields.gui,
          Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
        ];

        before('Setup consortia test data', () => {
          cy.getAdminToken();

          // Create user in member tenant with read-only permissions (working approach)
          cy.setTenant(Affiliations.College);
          cy.createTempUser(memberPermissions).then((userProperties) => {
            memberUser = userProperties;
          });
          cy.resetTenant(); // Get bibliographic specifications for both tenants
          getBibliographicSpec().then((centralBibSpec) => {
            centralBibSpecId = centralBibSpec.id;
          });

          cy.setTenant(Affiliations.College);
          getBibliographicSpec().then((memberBibSpec) => {
            memberBibSpecId = memberBibSpec.id;
          });
          cy.resetTenant();
        });

        beforeEach('Setup field and subfield references for both tenants', () => {
          // Central tenant - get field 100 and subfield 'a'
          cy.resetTenant();
          cy.getAdminToken();

          cy.getSpecificationFields(centralBibSpecId).then((centralFieldsResp) => {
            validateApiResponse(centralFieldsResp, 200);
            centralField100 = findStandardField(centralFieldsResp.body.fields, STANDARD_FIELD_TAG);
            expect(centralField100, 'Central field 100 should exist').to.exist;

            // Store original central field data for restoration
            originalCentralFieldData = { ...centralField100 };

            cy.getSpecificationFieldSubfields(centralField100.id).then((centralSubfieldsResp) => {
              validateApiResponse(centralSubfieldsResp, 200);
              centralSubfield100a = findSubfieldByCodeAndScope(
                centralSubfieldsResp.body.subfields,
                updatedSubfieldData.code,
                'standard',
              );
              expect(centralSubfield100a, 'Central subfield 100$a should exist').to.exist;

              // Store original central subfield data for restoration
              originalCentralSubfieldData = { ...centralSubfield100a };
            });
          });

          // Member tenant - get field 100 and subfield 'a'
          cy.setTenant(Affiliations.College);
          cy.getUserToken(memberUser.username, memberUser.password);

          cy.getSpecificationFields(memberBibSpecId).then((memberFieldsResp) => {
            validateApiResponse(memberFieldsResp, 200);
            memberField100 = findStandardField(memberFieldsResp.body.fields, STANDARD_FIELD_TAG);
            expect(memberField100, 'Member field 100 should exist').to.exist;

            // Store original member field data
            originalMemberFieldData = { ...memberField100 };

            cy.getSpecificationFieldSubfields(memberField100.id).then((memberSubfieldsResp) => {
              validateApiResponse(memberSubfieldsResp, 200);
              memberSubfield100a = findSubfieldByCodeAndScope(
                memberSubfieldsResp.body.subfields,
                updatedSubfieldData.code,
                'standard',
              );
              expect(memberSubfield100a, 'Member subfield 100$a should exist').to.exist;

              // Store original member subfield data
              originalMemberSubfieldData = { ...memberSubfield100a };
            });
          });

          cy.resetTenant();
        });

        after('Complete cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Restore original central field and subfield values
          if (originalCentralFieldData && centralField100) {
            cy.updateSpecificationField(centralField100.id, {
              tag: originalCentralFieldData.tag,
              label: originalCentralFieldData.label,
              url: originalCentralFieldData.url,
              required: originalCentralFieldData.required,
              repeatable: originalCentralFieldData.repeatable,
              deprecated: originalCentralFieldData.deprecated,
            });
          }

          if (originalCentralSubfieldData && centralSubfield100a) {
            cy.updateSpecificationSubfield(centralSubfield100a.id, {
              code: originalCentralSubfieldData.code,
              label: originalCentralSubfieldData.label,
              repeatable: originalCentralSubfieldData.repeatable,
              required: originalCentralSubfieldData.required,
              deprecated: originalCentralSubfieldData.deprecated,
            });
          }

          if (memberUser) {
            cy.setTenant(Affiliations.College);
            Users.deleteViaApi(memberUser.userId);
            cy.resetTenant();
          }
        });

        it(
          'C514894 Edit MARC bib validation rule on Central tenant and check that Member tenant is not affected (API) (spitfire)',
          { tags: ['criticalPathECS', 'C514894', 'spitfire'] },
          () => {
            // Step 1: Update field 100 on Central tenant (only URL and required for standard fields)
            cy.resetTenant();
            cy.getAdminToken();

            cy.updateSpecificationField(centralField100.id, updatedFieldData).then((fieldResp) => {
              validateApiResponse(fieldResp, 202);
              expect(fieldResp.body.tag, 'Step 1: Field tag updated').to.eq(updatedFieldData.tag);
              expect(fieldResp.body.label, 'Step 1: Field label updated').to.eq(
                updatedFieldData.label,
              );
              expect(fieldResp.body.url, 'Step 1: Field URL updated').to.eq(updatedFieldData.url);
              expect(fieldResp.body.required, 'Step 1: Field required updated').to.eq(
                updatedFieldData.required,
              );
              expect(fieldResp.body.repeatable, 'Step 1: Field repeatable unchanged').to.eq(
                updatedFieldData.repeatable,
              );
              expect(fieldResp.body.deprecated, 'Step 1: Field deprecated unchanged').to.eq(
                updatedFieldData.deprecated,
              );
            });

            // Step 2: Update subfield 100$a on Central tenant (only required for standard subfields)
            cy.updateSpecificationSubfield(centralSubfield100a.id, updatedSubfieldData).then(
              (subfieldResp) => {
                validateApiResponse(subfieldResp, 202);
                expect(subfieldResp.body.code, 'Step 2: Subfield code unchanged').to.eq(
                  updatedSubfieldData.code,
                );
                expect(subfieldResp.body.label, 'Step 2: Subfield label unchanged').to.eq(
                  updatedSubfieldData.label,
                );
                expect(subfieldResp.body.repeatable, 'Step 2: Subfield repeatable unchanged').to.eq(
                  updatedSubfieldData.repeatable,
                );
                expect(subfieldResp.body.required, 'Step 2: Subfield required updated').to.eq(
                  updatedSubfieldData.required,
                );
                expect(subfieldResp.body.deprecated, 'Step 2: Subfield deprecated unchanged').to.eq(
                  updatedSubfieldData.deprecated,
                );
              },
            );

            // Step 3: Verify updated field in Central tenant fields collection
            cy.getSpecificationFields(centralBibSpecId).then((updatedFieldsResp) => {
              validateApiResponse(updatedFieldsResp, 200);
              const updatedCentralField = findStandardField(
                updatedFieldsResp.body.fields,
                STANDARD_FIELD_TAG,
              );

              expect(updatedCentralField, 'Step 3: Updated field found in Central collection').to
                .exist;
              expect(updatedCentralField.url, 'Step 3: Central field URL reflects update').to.eq(
                updatedFieldData.url,
              );
              expect(
                updatedCentralField.required,
                'Step 3: Central field required reflects update',
              ).to.eq(updatedFieldData.required);
            });

            // Step 4: Verify updated subfield in Central tenant subfields collection
            cy.getSpecificationFieldSubfields(centralField100.id).then((updatedSubfieldsResp) => {
              validateApiResponse(updatedSubfieldsResp, 200);
              const updatedCentralSubfield = findSubfieldByCodeAndScope(
                updatedSubfieldsResp.body.subfields,
                updatedSubfieldData.code,
                'standard',
              );

              expect(updatedCentralSubfield, 'Step 4: Updated subfield found in Central collection')
                .to.exist;
              expect(
                updatedCentralSubfield.required,
                'Step 4: Central subfield required reflects update',
              ).to.eq(updatedSubfieldData.required);
            });

            // Step 5: Verify Member tenant is NOT affected (User B)
            cy.setTenant(Affiliations.College);
            cy.getUserToken(memberUser.username, memberUser.password);

            cy.getSpecificationFields(memberBibSpecId).then((memberFieldsResp) => {
              validateApiResponse(memberFieldsResp, 200);
              const memberFieldAfterUpdate = findStandardField(
                memberFieldsResp.body.fields,
                STANDARD_FIELD_TAG,
              );

              expect(memberFieldAfterUpdate, 'Step 5: Member field 100 still exists').to.exist;

              // Verify Member tenant field data unchanged
              expect(memberFieldAfterUpdate.url, 'Step 5: Member field URL unchanged').to.eq(
                originalMemberFieldData.url,
              );
              expect(
                memberFieldAfterUpdate.required,
                'Step 5: Member field required unchanged',
              ).to.eq(originalMemberFieldData.required);

              // Verify Member tenant subfield data unchanged
              cy.getSpecificationFieldSubfields(memberField100.id).then((memberSubfieldsResp) => {
                validateApiResponse(memberSubfieldsResp, 200);
                const memberSubfieldAfterUpdate = findSubfieldByCodeAndScope(
                  memberSubfieldsResp.body.subfields,
                  updatedSubfieldData.code,
                  'standard',
                );

                expect(memberSubfieldAfterUpdate, 'Step 5: Member subfield 100$a still exists').to
                  .exist;
                expect(
                  memberSubfieldAfterUpdate.required,
                  'Step 5: Member subfield required unchanged',
                ).to.eq(originalMemberSubfieldData.required);
              });
            });
          },
        );
      });
    });
  });
});
