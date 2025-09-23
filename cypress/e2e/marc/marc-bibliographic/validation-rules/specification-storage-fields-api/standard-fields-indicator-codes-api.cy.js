/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Standard Fields Indicator Codes API', () => {
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

  const EXPECTED_ERROR_MESSAGE =
    "The 'indicator_code' modification is not allowed for standard scope.";
  const STANDARD_FIELD_TAG = '243';

  let user;
  let bibSpecId;
  let standardField;
  let firstIndicator;
  let firstIndicatorCode;

  // Helper Functions
  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  function validateApiResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
  }

  function createTestPayload(baseCode, field, newValue) {
    return {
      code: field === 'code' ? newValue : baseCode.code,
      label: field === 'label' ? newValue : baseCode.label,
      deprecated: field === 'deprecated' ? newValue : baseCode.deprecated,
    };
  }

  function getTestScenarios(baseIndicatorCode) {
    return [
      {
        description: 'Update code field',
        payload: createTestPayload(baseIndicatorCode, 'code', '4'),
      },
      {
        description: 'Update label field',
        payload: createTestPayload(baseIndicatorCode, 'label', 'Forename Updated'),
      },
      {
        description: 'Update deprecated field',
        payload: createTestPayload(baseIndicatorCode, 'deprecated', true),
      },
    ];
  }

  function testModificationAttempts(baseIndicatorCode) {
    const testScenarios = getTestScenarios(baseIndicatorCode);

    testScenarios.forEach((scenario, index) => {
      cy.updateSpecificationIndicatorCode(baseIndicatorCode.id, scenario.payload, false).then(
        (updateResp) => {
          expect(updateResp.status, `Step ${index + 1}: ${scenario.description}`).to.eq(400);
          expect(updateResp.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
        },
      );
    });
  }

  function verifyIndicatorCodesUnchanged(originalCodes) {
    cy.getSpecificationIndicatorCodes(firstIndicator.id).then((verifyResp) => {
      validateApiResponse(verifyResp, 200);
      expect(verifyResp.body.codes).to.have.length(originalCodes.length);

      verifyResp.body.codes.forEach((indicatorCode) => {
        const originalCode = originalCodes.find((orig) => orig.id === indicatorCode.id);
        expect(originalCode, 'Original indicator code exists').to.exist;
        expect(indicatorCode.code).to.eq(originalCode.code);
        expect(indicatorCode.label).to.eq(originalCode.label);
        expect(indicatorCode.deprecated).to.eq(originalCode.deprecated);
      });
    });
  }

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

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502958 Cannot update Indicator code of Standard field for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C502958', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      cy.getSpecificationFields(bibSpecId).then((response) => {
        validateApiResponse(response, 200);

        standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
        expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

        cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
          validateApiResponse(indicatorsResp, 200);
          expect(indicatorsResp.body.indicators).to.have.length.greaterThan(0);

          firstIndicator = indicatorsResp.body.indicators[0];
          expect(firstIndicator, 'First indicator exists').to.exist;

          cy.getSpecificationIndicatorCodes(firstIndicator.id).then((codesResp) => {
            validateApiResponse(codesResp, 200);
            expect(codesResp.body.codes).to.have.length.greaterThan(0);

            const originalIndicatorCodes = [...codesResp.body.codes];
            firstIndicatorCode = originalIndicatorCodes[0];

            // Test all modification attempts
            testModificationAttempts(firstIndicatorCode);

            // Verify no changes occurred
            verifyIndicatorCodesUnchanged(originalIndicatorCodes);
          });
        });
      });
    },
  );
});
