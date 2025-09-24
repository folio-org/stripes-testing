/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - System Fields Indicator Codes API', () => {
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
    "The 'indicator_code' modification is not allowed for system scope.";
  const SYSTEM_FIELD_TAG = '999';

  let user;
  let authoritySpecId;
  let systemField;
  let firstIndicator;
  let firstIndicatorCode;

  // Helper Functions
  function findSystemField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'system');
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
        payload: createTestPayload(baseIndicatorCode, 'code', '2'),
      },
      {
        description: 'Update label field',
        payload: createTestPayload(baseIndicatorCode, 'label', 'Undefined Updated'),
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

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        // Find the specification with profile 'authority'
        const authoritySpec = specs.find((s) => s.profile === 'authority');
        expect(authoritySpec, 'MARC authority specification exists').to.exist;
        authoritySpecId = authoritySpec.id;
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
    'C502991 Cannot update Indicator Code of System Field for MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502991', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((response) => {
        validateApiResponse(response, 200);

        // Find a system field (e.g., 999)
        systemField = findSystemField(response.body.fields, SYSTEM_FIELD_TAG);
        expect(systemField, `System field ${SYSTEM_FIELD_TAG} exists`).to.exist;

        // Get indicators for the system field
        cy.getSpecificationFieldIndicators(systemField.id).then((indicatorsResp) => {
          validateApiResponse(indicatorsResp, 200);
          expect(indicatorsResp.body.indicators).to.have.length.greaterThan(0);

          // Get the first indicator
          firstIndicator = indicatorsResp.body.indicators[0];
          expect(firstIndicator, 'First indicator exists').to.exist;

          // Get indicator codes for the first indicator
          cy.getSpecificationIndicatorCodes(firstIndicator.id).then((codesResp) => {
            validateApiResponse(codesResp, 200);
            expect(codesResp.body.codes).to.have.length.greaterThan(0);

            // Store original indicator codes for verification
            const originalIndicatorCodes = [...codesResp.body.codes];
            firstIndicatorCode = originalIndicatorCodes[0];

            // Test all modification attempts
            testModificationAttempts(firstIndicatorCode);

            // Step 4: Verify indicator codes didn't change
            verifyIndicatorCodesUnchanged(originalIndicatorCodes);
          });
        });
      });
    },
  );
});
