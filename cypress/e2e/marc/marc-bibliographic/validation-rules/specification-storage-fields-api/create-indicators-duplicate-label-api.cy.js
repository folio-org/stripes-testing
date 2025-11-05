/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Indicators with Duplicate Label API', () => {
  // User with required permissions to create fields and indicators
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
  ];

  const LOCAL_FIELD_TAG = '972';
  const TEST_CASE_ID = 'C499659';
  const DUPLICATE_LABEL = 'Same Ind name'; // Label that will be duplicated

  let user;
  let bibSpecId;
  let localFieldId;
  let indicator1Id;
  let indicator2Id;

  before('Create user and setup local field', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        // Clean up any existing field with the same tag
        cy.deleteSpecificationFieldByTag(bibSpecId, LOCAL_FIELD_TAG, false);

        // Create local field for indicator testing
        const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
        const testData = fieldTestDataBuilder
          .withField(LOCAL_FIELD_TAG, 'Local Field for Duplicate Label Test', {
            url: 'http://www.example.org/field972.html',
            repeatable: false,
            required: false,
            deprecated: false,
          })
          .build();

        cy.createSpecificationField(bibSpecId, testData.field).then((response) => {
          validateApiResponse(response, 201);
          localFieldId = response.body.id;
          expect(response.body.scope).to.eq('local');
          expect(response.body.tag).to.eq(LOCAL_FIELD_TAG);
        });
      });
    });
  });

  after('Delete test user and clean up created field', () => {
    if (user) {
      cy.getAdminToken();

      // Clean up created field
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }

      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499659 Create Indicators of Local field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C499659', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create first indicator with specific label
      const indicator1Payload = {
        order: 1,
        label: DUPLICATE_LABEL,
      };

      cy.createSpecificationFieldIndicator(localFieldId, indicator1Payload).then((response1) => {
        validateApiResponse(response1, 201);
        const firstIndicator = response1.body;
        indicator1Id = firstIndicator.id;

        // Validate first indicator response
        expect(firstIndicator.id, 'First indicator should have an ID').to.exist;
        expect(firstIndicator.fieldId, 'First indicator should be linked to field').to.eq(
          localFieldId,
        );
        expect(firstIndicator.order, 'First indicator should have order 1').to.eq(1);
        expect(firstIndicator.label, 'First indicator should have correct label').to.eq(
          DUPLICATE_LABEL,
        );
        expect(firstIndicator.metadata, 'First indicator should have metadata').to.exist;

        // Step 2: Create second indicator with the SAME label (should succeed for local fields)
        const indicator2Payload = {
          order: 2,
          label: DUPLICATE_LABEL, // Same label as first indicator
        };

        cy.createSpecificationFieldIndicator(localFieldId, indicator2Payload).then((response2) => {
          validateApiResponse(response2, 201);
          const secondIndicator = response2.body;
          indicator2Id = secondIndicator.id;

          // Validate second indicator response
          expect(secondIndicator.id, 'Second indicator should have an ID').to.exist;
          expect(secondIndicator.fieldId, 'Second indicator should be linked to field').to.eq(
            localFieldId,
          );
          expect(secondIndicator.order, 'Second indicator should have order 2').to.eq(2);
          expect(secondIndicator.label, 'Second indicator should have same label').to.eq(
            DUPLICATE_LABEL,
          );
          expect(secondIndicator.metadata, 'Second indicator should have metadata').to.exist;

          // Ensure indicators have different IDs even with same label
          expect(secondIndicator.id, 'Indicators should have different IDs').to.not.eq(
            firstIndicator.id,
          );

          // Step 3: Retrieve all indicators to verify both exist
          cy.getSpecificationFieldIndicators(localFieldId).then((getResponse) => {
            validateApiResponse(getResponse, 200);
            const indicators = getResponse.body.indicators;

            expect(indicators, 'Should have exactly 2 indicators').to.have.length(2);

            // Find and validate first indicator in response
            const retrievedIndicator1 = indicators.find((ind) => ind.order === 1);
            expect(retrievedIndicator1, 'First indicator should be found in response').to.exist;
            expect(retrievedIndicator1.id).to.eq(indicator1Id);
            expect(retrievedIndicator1.fieldId).to.eq(localFieldId);
            expect(retrievedIndicator1.order).to.eq(1);
            expect(retrievedIndicator1.label).to.eq(DUPLICATE_LABEL);

            // Find and validate second indicator in response
            const retrievedIndicator2 = indicators.find((ind) => ind.order === 2);
            expect(retrievedIndicator2, 'Second indicator should be found in response').to.exist;
            expect(retrievedIndicator2.id).to.eq(indicator2Id);
            expect(retrievedIndicator2.fieldId).to.eq(localFieldId);
            expect(retrievedIndicator2.order).to.eq(2);
            expect(retrievedIndicator2.label).to.eq(DUPLICATE_LABEL);

            // Verify both indicators have the same label (proving duplicates are allowed)
            expect(retrievedIndicator1.label, 'Both indicators should have same label').to.eq(
              retrievedIndicator2.label,
            );

            cy.log(
              `Successfully created 2 indicators with duplicate label "${DUPLICATE_LABEL}" on local field ${LOCAL_FIELD_TAG}`,
            );
          });
        });
      });
    },
  );
});
