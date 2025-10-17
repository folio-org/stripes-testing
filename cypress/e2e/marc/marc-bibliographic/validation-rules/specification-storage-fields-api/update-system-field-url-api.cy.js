/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Update System Field URL API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const EXPECTED_ERROR_MESSAGE = "The 'url' field should be valid URL.";
  const SYSTEM_FIELD_TAG = '245'; // Title Statement field

  function findSystemField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'system');
  }

  let user;
  let bibSpecId;
  let systemField;

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
    'C499786 Update System Field "url" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C499786', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a system field (245 - Title Statement)
        systemField = findSystemField(response.body.fields, SYSTEM_FIELD_TAG);
        expect(systemField, `System field ${SYSTEM_FIELD_TAG} exists`).to.exist;

        // Step 1: Update system field without "url" field (should succeed)
        const payloadWithoutUrl = {
          tag: SYSTEM_FIELD_TAG,
          label: 'Title Statement',
          repeatable: false,
          required: true,
          deprecated: false,
        };

        cy.updateSpecificationField(systemField.id, payloadWithoutUrl).then((updateResp1) => {
          expect(updateResp1.status, 'Step 1: Update without url should succeed').to.eq(202);
          expect(updateResp1.body).to.not.have.property('url');
        });

        // Step 2: Verify the updated field doesn't have "url" field
        cy.getSpecificationFields(bibSpecId).then((getResp) => {
          expect(getResp.status).to.eq(200);
          const updatedField = findSystemField(getResp.body.fields, SYSTEM_FIELD_TAG);
          expect(updatedField, 'Updated field should not have url property').to.not.have.property(
            'url',
          );
        });

        // Step 3: Update with empty URL (should fail)
        const payloadWithEmptyUrl = {
          tag: SYSTEM_FIELD_TAG,
          label: 'Title Statement',
          url: '',
          repeatable: false,
          required: true,
          deprecated: false,
        };

        cy.updateSpecificationField(systemField.id, payloadWithEmptyUrl, false).then(
          (updateResp3) => {
            expect(updateResp3.status, 'Step 3: Update with empty url should fail').to.eq(400);
            expect(updateResp3.body.errors).to.exist;
            expect(updateResp3.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
          },
        );

        // Step 4: Update with URL without protocol (should fail)
        const payloadWithoutProtocol = {
          tag: SYSTEM_FIELD_TAG,
          label: 'Title Statement',
          url: 'www.loc.gov/marc/bibliographic/bd245.html',
          repeatable: false,
          required: true,
          deprecated: false,
        };

        cy.updateSpecificationField(systemField.id, payloadWithoutProtocol, false).then(
          (updateResp4) => {
            expect(updateResp4.status, 'Step 4: Update without protocol should fail').to.eq(400);
            expect(updateResp4.body.errors).to.exist;
            expect(updateResp4.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
          },
        );

        // Step 5: Update with invalid protocol (should fail)
        const payloadWithInvalidProtocol = {
          tag: SYSTEM_FIELD_TAG,
          label: 'Title Statement',
          url: 'httpwww.loc.gov/marc/bibliographic/bd245.html',
          repeatable: false,
          required: true,
          deprecated: false,
        };

        cy.updateSpecificationField(systemField.id, payloadWithInvalidProtocol, false).then(
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
          tag: SYSTEM_FIELD_TAG,
          label: 'Title Statement',
          url: ' ',
          repeatable: false,
          required: true,
          deprecated: false,
        };

        cy.updateSpecificationField(systemField.id, payloadWithSpaceOnlyUrl, false).then(
          (updateResp6) => {
            expect(updateResp6.status, 'Step 6: Update with space-only url should fail').to.eq(400);
            expect(updateResp6.body.errors).to.exist;
            expect(updateResp6.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
          },
        );

        // Step 7: Update with URL containing space in the middle (should fail)
        const payloadWithSpaceInMiddle = {
          tag: SYSTEM_FIELD_TAG,
          label: 'Title Statement',
          url: 'http://www.exam ple.org/field245.html',
          repeatable: false,
          required: true,
          deprecated: false,
        };

        cy.updateSpecificationField(systemField.id, payloadWithSpaceInMiddle, false).then(
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
          tag: SYSTEM_FIELD_TAG,
          label: 'Title Statement',
          url: 'https://www.loc.gov/marc/bibliographic/bd245.htmlhttps://www.loc.gov/marc/bibliographic/bd246.html',
          repeatable: false,
          required: true,
          deprecated: false,
        };

        cy.updateSpecificationField(systemField.id, payloadWithMultipleUrls, false).then(
          (updateResp8) => {
            expect(updateResp8.status, 'Step 8: Update with multiple urls should fail').to.eq(400);
            expect(updateResp8.body.errors).to.exist;
            expect(updateResp8.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
          },
        );

        // Step 9: Update with URL having spaces at beginning and end (should succeed and trim)
        const payloadWithSpacesAroundUrl = {
          tag: SYSTEM_FIELD_TAG,
          label: 'Title Statement',
          url: ' https://www.loc.gov/marc/bibliographic/bd245.html ',
          repeatable: false,
          required: true,
          deprecated: false,
        };

        cy.updateSpecificationField(systemField.id, payloadWithSpacesAroundUrl).then(
          (updateResp9) => {
            expect(
              updateResp9.status,
              'Step 9: Update with spaces around url should succeed',
            ).to.eq(202);
            expect(updateResp9.body.url).to.eq('https://www.loc.gov/marc/bibliographic/bd245.html');
          },
        );

        // Step 10: Update with valid URL (should succeed)
        const payloadWithValidUrl = {
          tag: SYSTEM_FIELD_TAG,
          label: 'Title Statement',
          url: 'https://www.loc.gov/marc/bibliographic/bd245/updated.html',
          repeatable: false,
          required: true,
          deprecated: false,
        };

        cy.updateSpecificationField(systemField.id, payloadWithValidUrl).then((updateResp10) => {
          expect(updateResp10.status, 'Step 10: Update with valid url should succeed').to.eq(202);
          expect(updateResp10.body.url).to.eq(
            'https://www.loc.gov/marc/bibliographic/bd245/updated.html',
          );
        });

        // Step 11: Verify the final updated field has the correct URL
        cy.getSpecificationFields(bibSpecId).then((finalGetResp) => {
          expect(finalGetResp.status).to.eq(200);
          const finalField = findSystemField(finalGetResp.body.fields, SYSTEM_FIELD_TAG);
          expect(finalField.url, 'Final field should have updated url').to.eq(
            'https://www.loc.gov/marc/bibliographic/bd245/updated.html',
          );
        });
      });
    },
  );
});
