/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Create Indicators of Local Field API', () => {
  // User with required permissions to create fields and indicators
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
  ];

  let user;
  let bibSpecId;
  let localField;
  const createdIndicators = [];

  const localFieldPayload = {
    tag: '899',
    label: 'AT_C499650_Local Field for Indicators Test',
    url: 'http://www.example.org/field899.html',
    repeatable: false,
    required: false,
    deprecated: false,
    scope: 'local',
  };

  before('Create user and setup local field', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;

        // Clean up any existing field with the same tag and create a new one
        cy.deleteSpecificationFieldByTag(bibSpecId, localFieldPayload.tag, false).then(() => {
          cy.createSpecificationField(bibSpecId, localFieldPayload).then((response) => {
            expect(response.status).to.eq(201);
            localField = response.body;
            expect(localField.tag).to.eq(localFieldPayload.tag);
            expect(localField.scope).to.eq('local');
          });
        });
      });
    });
  });

  after('Delete test user and clean up created field', () => {
    if (user) {
      cy.getAdminToken();
      if (localField && localField.scope === 'local') {
        cy.deleteSpecificationField(localField.id, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499650 Create Indicators of Local field for MARC bib spec (API) (spitfire)',
    { tags: ['C499650', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Create first indicator (order: 1)
      const indicator1Payload = {
        order: 1,
        label: 'Ind 1 name',
      };

      cy.createSpecificationFieldIndicator(localField.id, indicator1Payload).then((response) => {
        expect(response.status, 'Step 1: Create first indicator').to.eq(201);
        expect(response.body.fieldId).to.eq(localField.id);
        expect(response.body.order).to.eq(1);
        expect(response.body.label).to.eq('Ind 1 name');
        expect(response.body.id).to.exist;
        expect(response.body.metadata).to.exist;

        const firstIndicator = response.body;
        createdIndicators.push(firstIndicator);

        // Step 2: Create second indicator (order: 2)
        const indicator2Payload = {
          order: 2,
          label: 'Ind 2 name',
        };

        cy.createSpecificationFieldIndicator(localField.id, indicator2Payload).then((response2) => {
          expect(response2.status, 'Step 2: Create second indicator').to.eq(201);
          expect(response2.body.fieldId).to.eq(localField.id);
          expect(response2.body.order).to.eq(2);
          expect(response2.body.label).to.eq('Ind 2 name');
          expect(response2.body.id).to.exist;
          expect(response2.body.metadata).to.exist;

          const secondIndicator = response2.body;
          createdIndicators.push(secondIndicator);

          // Step 3: Verify both indicators are retrieved correctly
          cy.getSpecificationFieldIndicators(localField.id).then((getResponse) => {
            expect(getResponse.status, 'Step 3: Get field indicators').to.eq(200);
            expect(getResponse.body.indicators).to.have.length(2);

            // Verify first indicator in response
            const retrievedIndicator1 = getResponse.body.indicators.find((ind) => ind.order === 1);
            expect(retrievedIndicator1, 'First indicator found in response').to.exist;
            expect(retrievedIndicator1.id).to.eq(firstIndicator.id);
            expect(retrievedIndicator1.fieldId).to.eq(localField.id);
            expect(retrievedIndicator1.order).to.eq(1);
            expect(retrievedIndicator1.label).to.eq('Ind 1 name');

            // Verify second indicator in response
            const retrievedIndicator2 = getResponse.body.indicators.find((ind) => ind.order === 2);
            expect(retrievedIndicator2, 'Second indicator found in response').to.exist;
            expect(retrievedIndicator2.id).to.eq(secondIndicator.id);
            expect(retrievedIndicator2.fieldId).to.eq(localField.id);
            expect(retrievedIndicator2.order).to.eq(2);
            expect(retrievedIndicator2.label).to.eq('Ind 2 name');
          });
        });
      });
    },
  );
});
