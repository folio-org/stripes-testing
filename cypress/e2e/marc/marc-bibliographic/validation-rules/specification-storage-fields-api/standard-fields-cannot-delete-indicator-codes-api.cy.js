/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Standard Fields Cannot Delete Indicator Codes API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;
  let firstIndicator;
  let firstIndicatorCode;

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
    'C503102 Cannot delete Indicator Code of Standard Field for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C503102', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., 243)
        standardField = findStandardField(response.body.fields, '243');
        expect(standardField, 'Standard field 243 exists').to.exist;

        // Get indicators for the standard field
        cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
          expect(indicatorsResp.status).to.eq(200);
          expect(indicatorsResp.body.indicators).to.have.length.greaterThan(0);

          // Get the first indicator
          firstIndicator = indicatorsResp.body.indicators[0];
          expect(firstIndicator, 'First indicator exists').to.exist;

          // Get indicator codes for the first indicator
          cy.getSpecificationIndicatorCodes(firstIndicator.id).then((codesResp) => {
            expect(codesResp.status).to.eq(200);
            expect(codesResp.body.codes).to.have.length.greaterThan(0);

            // Store original indicator codes for verification
            const originalIndicatorCodes = [...codesResp.body.codes];
            firstIndicatorCode = originalIndicatorCodes[0];

            // Step 1: Attempt to delete indicator code of standard field
            cy.deleteSpecificationIndicatorCode(firstIndicatorCode.id, false).then((deleteResp) => {
              expect(deleteResp.status, 'Step 1: Delete standard field indicator code').to.eq(400);
              expect(deleteResp.body.errors[0].message).to.contain(
                'A standard scope indicator_code cannot be deleted.',
              );
            });

            // Step 2: Verify standard field indicator codes didn't change
            cy.getSpecificationIndicatorCodes(firstIndicator.id).then((verifyResp) => {
              expect(verifyResp.status, 'Step 2: Get indicator codes after delete attempt').to.eq(
                200,
              );

              // Verify all indicator codes remain unchanged
              expect(verifyResp.body.codes).to.have.length(originalIndicatorCodes.length);

              verifyResp.body.codes.forEach((indicatorCode) => {
                const originalCode = originalIndicatorCodes.find(
                  (orig) => orig.id === indicatorCode.id,
                );
                expect(originalCode, 'Original indicator code exists').to.exist;
                expect(indicatorCode.code).to.eq(originalCode.code);
                expect(indicatorCode.label).to.eq(originalCode.label);
                expect(indicatorCode.deprecated).to.eq(originalCode.deprecated);
              });
            });
          });
        });
      });
    },
  );
});
