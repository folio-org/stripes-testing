/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

// TestRail: C502973
// Title: Cannot update Local Indicator code of Standard field with invalid "label" length for MARC bib spec
// Steps covered:
// 1. Update with 351-char label -> 400 + error
// 2. Update with 350-char label -> 202
// 3. Update with 349-char label -> 202
// 4. Update with 1-char label -> 202
// 5. GET indicator codes -> include updated local code + standard LOC codes

describe('MARC Bibliographic Validation Rules - Cannot Update Local Indicator Code Invalid Label Length Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageUpdateSpecificationIndicatorCode.gui,
  ];

  const STANDARD_FIELD_TAG = '011'; // Reuse standard field used in other tests
  const ERROR_MESSAGE_EXCEEDED = "The 'label' field has exceeded 350 character limit";

  // Provide deterministic long strings identical to other length-validation tests for consistency
  const LABEL_351 =
    '351 character test Label validation during creation of validation rule for MARC bibliographic record via API (351 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 351 character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographicc';
  const LABEL_350 =
    '350 character test Label validation during creation of validation rule for MARC bibliographic record via API (350 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 35 0character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographic';
  const LABEL_349 =
    '349 character test Label validation during creation of validation rule for MARC bibliographic record via API (350 character test Label validation during creation of validation rule for MARC bibliographic record via API) - 35 0character test Label validation during creation of validation rule for MARC bibliographic record via API. MARC bibliographi';

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;
  let firstIndicator;
  let localIndicatorCodeId;
  const createPayload = {
    code: 'x',
    label: 'AT_C502973_Test Local Code',
    deprecated: false,
  };

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
      });
    });
  });

  before('Setup test data - create local indicator code for standard field', () => {
    cy.getUserToken(user.username, user.password);

    cy.getSpecificationFields(bibSpecId).then((response) => {
      expect(response.status).to.eq(200);
      standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
      expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

      cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
        expect(indicatorsResp.status).to.eq(200);
        expect(indicatorsResp.body.indicators).to.have.length.greaterThan(0);

        firstIndicator = indicatorsResp.body.indicators[0];
        expect(firstIndicator, 'First indicator exists').to.exist;

        // Cleanup any previous test local codes for this test case
        cy.getSpecificationIndicatorCodes(firstIndicator.id).then((codesResp) => {
          expect(codesResp.status).to.eq(200);
          const previousTestCodes = codesResp.body.codes.filter(
            (c) => c.label.startsWith('AT_C502973_') || c.code === createPayload.code,
          );
          previousTestCodes.forEach((c) => {
            cy.deleteSpecificationIndicatorCode(c.id, false);
          });
          cy.createSpecificationIndicatorCode(firstIndicator.id, createPayload).then(
            (createResp) => {
              expect(createResp.status).to.eq(201);
              localIndicatorCodeId = createResp.body.id;
            },
          );
        });
      });
    });
  });

  after('Cleanup - delete created indicator code and user', () => {
    if (user) {
      cy.getAdminToken();
      if (localIndicatorCodeId) {
        cy.deleteSpecificationIndicatorCode(localIndicatorCodeId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502973 Cannot update Local Indicator code of Standard field with invalid "label" length for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502973', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: 351 chars -> should fail 400
      const update351 = { ...createPayload, label: LABEL_351 };
      cy.updateSpecificationIndicatorCode(localIndicatorCodeId, update351, false).then(
        (resp351) => {
          expect(resp351.status, 'Step 1: 351-char label should fail').to.eq(400);
          expect(resp351.body.errors).to.exist;
          expect(resp351.body.errors[0].message).to.include(ERROR_MESSAGE_EXCEEDED);
        },
      );

      // Step 2: 350 chars -> should succeed 202
      const update350 = { ...createPayload, label: LABEL_350 };
      cy.updateSpecificationIndicatorCode(localIndicatorCodeId, update350).then((resp350) => {
        expect(resp350.status, 'Step 2: 350-char label should succeed').to.eq(202);
        expect(resp350.body.label).to.eq(LABEL_350);
      });

      // Step 3: 349 chars -> should succeed 202
      const update349 = { ...createPayload, label: LABEL_349 };
      cy.updateSpecificationIndicatorCode(localIndicatorCodeId, update349).then((resp349) => {
        expect(resp349.status, 'Step 3: 349-char label should succeed').to.eq(202);
        expect(resp349.body.label).to.eq(LABEL_349);
      });

      // Step 4: 1 char -> should succeed 202
      const update1 = { ...createPayload, label: '1' };
      cy.updateSpecificationIndicatorCode(localIndicatorCodeId, update1).then((resp1) => {
        expect(resp1.status, 'Step 4: 1-char label should succeed').to.eq(202);
        expect(resp1.body.label).to.eq('1');
      });

      // Step 5: GET indicator codes -> verify updated code and that standard LOC codes still present
      cy.getSpecificationIndicatorCodes(firstIndicator.id).then((getResp) => {
        expect(getResp.status, 'Step 5: GET indicator codes should succeed').to.eq(200);
        expect(getResp.body.codes).to.exist;

        const updatedLocal = getResp.body.codes.find((c) => c.id === localIndicatorCodeId);
        expect(updatedLocal, 'Updated local indicator code exists').to.exist;
        expect(updatedLocal.label, 'Local code label final value').to.eq('1');

        const standardCodes = getResp.body.codes.filter((c) => c.scope === 'standard');
        expect(standardCodes.length, 'Should still have standard LOC codes').to.be.greaterThan(0);
      });
    },
  );
});
