/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Update Local Deprecated Indicator Code Standard Field API', () => {
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

  const STANDARD_FIELD_TAG = '011';
  const TEST_LABEL_PREFIX = 'AT_C502975_';
  const LOCAL_CODE_VALUE = 'v'; // Using 'v' to minimize collision with other tests

  // Creation payload defined outside hooks
  const CREATE_LOCAL_CODE_PAYLOAD = {
    code: LOCAL_CODE_VALUE,
    label: `${TEST_LABEL_PREFIX}Test Local Code`,
    deprecated: false,
  };

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;
  let firstIndicator;
  let localIndicatorCodeId;

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

        // Clean up any leftover codes from previous runs or conflicting code values
        cy.getSpecificationIndicatorCodes(firstIndicator.id).then((existingCodesResp) => {
          const existingTestCodes = existingCodesResp.body.codes.filter(
            (code) => code.scope ===
              (code.label.includes(TEST_LABEL_PREFIX) || code.code === LOCAL_CODE_VALUE),
          );
          existingTestCodes.forEach((code) => {
            cy.deleteSpecificationIndicatorCode(code.id, false).then(() => {
              cy.log('Cleaned up existing test indicator code from previous run');
            });
          });
        });

        // Create a local indicator code for testing deprecated updates
        cy.createSpecificationIndicatorCode(firstIndicator.id, CREATE_LOCAL_CODE_PAYLOAD).then(
          (createResp) => {
            expect(createResp.status).to.eq(201);
            localIndicatorCodeId = createResp.body.id;
          },
        );
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
    'C502975 Update Local Deprecated Indicator Code of Standard Field for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502975', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Update indicator code with deprecated: true (should succeed)
      const updateToDeprecatedTrue = {
        code: LOCAL_CODE_VALUE,
        label: 'Deprecated - true test',
        deprecated: true,
      };

      cy.updateSpecificationIndicatorCode(localIndicatorCodeId, updateToDeprecatedTrue).then(
        (resp1) => {
          expect(resp1.status, 'Step 1: Update with deprecated: true should succeed').to.eq(202);
          expect(resp1.body.id).to.eq(localIndicatorCodeId);
          expect(resp1.body.code).to.eq(updateToDeprecatedTrue.code);
          expect(resp1.body.label).to.eq(updateToDeprecatedTrue.label);
          expect(resp1.body.deprecated).to.eq(true);
          expect(resp1.body.scope).to.eq('local');
        },
      );

      // Step 2: Update indicator code with deprecated: false (should succeed)
      const updateToDeprecatedFalse = {
        code: LOCAL_CODE_VALUE,
        label: 'Deprecated - false test',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(localIndicatorCodeId, updateToDeprecatedFalse).then(
        (resp2) => {
          expect(resp2.status, 'Step 2: Update with deprecated: false should succeed').to.eq(202);
          expect(resp2.body.id).to.eq(localIndicatorCodeId);
          expect(resp2.body.code).to.eq(updateToDeprecatedFalse.code);
          expect(resp2.body.label).to.eq(updateToDeprecatedFalse.label);
          expect(resp2.body.deprecated).to.eq(false);
          expect(resp2.body.scope).to.eq('local');
        },
      );

      // Step 3: Update indicator code with invalid deprecated value (should fail)
      const updateWithInvalidDeprecated = {
        code: LOCAL_CODE_VALUE,
        label: 'Deprecated - misspell test',
        deprecated: 'test', // Invalid value - should be boolean
      };

      cy.updateSpecificationIndicatorCode(
        localIndicatorCodeId,
        updateWithInvalidDeprecated,
        false,
      ).then((resp3) => {
        expect(resp3.status, 'Step 3: Update with invalid deprecated value should fail').to.eq(400);
        expect(resp3.body.errors).to.exist;
        expect(resp3.body.errors).to.have.length.greaterThan(0);

        // Verify error message contains JSON parse error information as specified in TestRail
        const errorMessage = resp3.body.errors[0].message;
        expect(errorMessage, 'Should contain JSON parse error message').to.contain(
          'JSON parse error',
        );
        expect(errorMessage, 'Should mention unrecognized token').to.contain(
          'only "true" or "false" recognized',
        );
      });
    },
  );
});
