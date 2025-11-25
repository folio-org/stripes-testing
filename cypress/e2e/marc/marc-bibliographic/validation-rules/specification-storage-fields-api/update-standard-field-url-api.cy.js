/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Update Standard Field URL API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const EXPECTED_ERROR_MESSAGE = "The 'url' field should be valid URL.";
  const STANDARD_FIELD_TAG = '100'; // Main Entry - Personal Name field

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;

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
    'C499818 Cannot update Standard field with invalid "url" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C499818', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (100 - Main Entry - Personal Name)
        standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
        expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

        // Step 1: Update standard field without "url" field (should succeed)
        const payloadWithoutUrl = {
          tag: STANDARD_FIELD_TAG,
          label: 'Main Entry - Personal Name',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(standardField.id, payloadWithoutUrl).then((updateResp1) => {
          expect(updateResp1.status, 'Step 1: Update without url should succeed').to.eq(202);
          expect(updateResp1.body).to.not.have.property('url');
        });

        // Step 2: Verify the updated field doesn't have "url" field
        cy.getSpecificationFields(bibSpecId).then((getResp) => {
          expect(getResp.status).to.eq(200);
          const updatedField = findStandardField(getResp.body.fields, STANDARD_FIELD_TAG);
          expect(updatedField, 'Updated field should not have url property').to.not.have.property(
            'url',
          );
        });

        // Step 3: Update with empty URL (should fail)
        const payloadWithEmptyUrl = {
          tag: STANDARD_FIELD_TAG,
          label: 'Main Entry - Personal Name',
          url: '',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(standardField.id, payloadWithEmptyUrl, false).then(
          (updateResp3) => {
            expect(updateResp3.status, 'Step 3: Update with empty url should fail').to.eq(400);
            expect(updateResp3.body.errors).to.exist;
            expect(updateResp3.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
          },
        );

        // Step 4: Update with URL without protocol (should fail)
        const payloadWithoutProtocol = {
          tag: STANDARD_FIELD_TAG,
          label: 'Main Entry - Personal Name',
          url: 'www.loc.gov/marc/bibliographic/bd100.html',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(standardField.id, payloadWithoutProtocol, false).then(
          (updateResp4) => {
            expect(updateResp4.status, 'Step 4: Update without protocol should fail').to.eq(400);
            expect(updateResp4.body.errors).to.exist;
            expect(updateResp4.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
          },
        );

        // Step 5: Update with URL having invalid protocol (should fail)
        const payloadWithInvalidProtocol = {
          tag: STANDARD_FIELD_TAG,
          label: 'Main Entry - Personal Name',
          url: 'httpswww.loc.gov/marc/bibliographic/bd100.html',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(standardField.id, payloadWithInvalidProtocol, false).then(
          (updateResp5) => {
            expect(updateResp5.status, 'Step 5: Update with invalid protocol should fail').to.eq(
              400,
            );
            expect(updateResp5.body.errors).to.exist;
            expect(updateResp5.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
          },
        );

        // Step 6: Update with URL containing only space (should fail)
        const payloadWithSpaceOnlyUrl = {
          tag: STANDARD_FIELD_TAG,
          label: 'Main Entry - Personal Name',
          url: ' ',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(standardField.id, payloadWithSpaceOnlyUrl, false).then(
          (updateResp6) => {
            expect(updateResp6.status, 'Step 6: Update with space-only url should fail').to.eq(400);
            expect(updateResp6.body.errors).to.exist;
            expect(updateResp6.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
          },
        );

        // Step 7: Update with URL containing space in the middle (should fail)
        const payloadWithSpaceInMiddle = {
          tag: STANDARD_FIELD_TAG,
          label: 'Main Entry - Personal Name',
          url: 'http://www.loc. gov/marc/bibliographic/bd100.html',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(standardField.id, payloadWithSpaceInMiddle, false).then(
          (updateResp7) => {
            expect(updateResp7.status, 'Step 7: Update with space in middle should fail').to.eq(
              400,
            );
            expect(updateResp7.body.errors).to.exist;
            expect(updateResp7.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
          },
        );

        // Step 8: Update with multiple concatenated URLs (should fail)
        const payloadWithMultipleUrls = {
          tag: STANDARD_FIELD_TAG,
          label: 'Main Entry - Personal Name',
          url: 'https://www.loc.gov/marc/bibliographic/bd100.htmlhttps://www.loc.gov/marc/bibliographic/bd110.html',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(standardField.id, payloadWithMultipleUrls, false).then(
          (updateResp8) => {
            expect(updateResp8.status, 'Step 8: Update with multiple urls should fail').to.eq(400);
            expect(updateResp8.body.errors).to.exist;
            expect(updateResp8.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
          },
        );

        // Step 9: Update with URL having spaces at beginning and end (should succeed and trim)
        const payloadWithSpacesAroundUrl = {
          tag: STANDARD_FIELD_TAG,
          label: 'Main Entry - Personal Name',
          url: ' https://www.loc.gov/marc/bibliographic/bd100.html ',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(standardField.id, payloadWithSpacesAroundUrl).then(
          (updateResp9) => {
            expect(
              updateResp9.status,
              'Step 9: Update with spaces around url should succeed',
            ).to.eq(202);
            expect(updateResp9.body.url).to.eq('https://www.loc.gov/marc/bibliographic/bd100.html');
          },
        );

        // Step 10: Update with valid URL (should succeed)
        const payloadWithValidUrl = {
          tag: STANDARD_FIELD_TAG,
          label: 'Main Entry - Personal Name',
          url: 'https://www.loc.gov/marc/bibliographic/bd100/updated.html',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(standardField.id, payloadWithValidUrl).then((updateResp10) => {
          expect(updateResp10.status, 'Step 10: Update with valid url should succeed').to.eq(202);
          expect(updateResp10.body.url).to.eq(
            'https://www.loc.gov/marc/bibliographic/bd100/updated.html',
          );
        });

        // Step 11: Verify the final updated field has the correct URL
        cy.getSpecificationFields(bibSpecId).then((finalGetResp) => {
          expect(finalGetResp.status).to.eq(200);
          const finalField = findStandardField(finalGetResp.body.fields, STANDARD_FIELD_TAG);
          expect(finalField.url, 'Final field should have updated url').to.eq(
            'https://www.loc.gov/marc/bibliographic/bd100/updated.html',
          );
        });
      });
    },
  );
});
