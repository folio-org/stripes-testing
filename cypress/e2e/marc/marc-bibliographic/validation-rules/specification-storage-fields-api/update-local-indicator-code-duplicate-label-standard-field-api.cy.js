/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Update Local Indicator Code Duplicate Label Standard Field API', () => {
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

  const STANDARD_FIELD_TAG = '011'; // Using same standard field tag leveraged in earlier tests

  // Indicator code values chosen to minimize collision with other tests (using 'v' and 'w')
  const LOCAL_CODE1_VALUE = 'v';
  const LOCAL_CODE2_VALUE = 'w';
  const LOCAL_CODE1_LABEL_CONST = 'AT_C502974_Local Code 1';
  const LOCAL_CODE2_LABEL_CONST = 'AT_C502974_Local Code 2';
  const TEST_LABEL_PREFIX = 'AT_C502974_';

  // Creation payloads defined outside hooks per request
  const CREATE_LOCAL_CODE1_PAYLOAD = {
    code: LOCAL_CODE1_VALUE,
    label: LOCAL_CODE1_LABEL_CONST,
    deprecated: false,
  };
  const CREATE_LOCAL_CODE2_PAYLOAD = {
    code: LOCAL_CODE2_VALUE,
    label: LOCAL_CODE2_LABEL_CONST,
    deprecated: false,
  };

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;
  let firstIndicator;
  let localCode1Id;
  let localCode2Id;
  let localCode1Label;
  let chosenStandardLabel; // Label from a standard (LOC) indicator code

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

  before('Setup test data - create two local indicator codes on a standard field', () => {
    cy.getUserToken(user.username, user.password);

    cy.getSpecificationFields(bibSpecId).then((fieldsResp) => {
      expect(fieldsResp.status).to.eq(200);
      standardField = findStandardField(fieldsResp.body.fields, STANDARD_FIELD_TAG);
      expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

      cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
        expect(indicatorsResp.status).to.eq(200);
        expect(indicatorsResp.body.indicators).to.have.length.greaterThan(0);
        firstIndicator = indicatorsResp.body.indicators[0];
        expect(firstIndicator, 'First indicator exists').to.exist;

        // Get existing codes (both standard & local) to prepare test
        cy.getSpecificationIndicatorCodes(firstIndicator.id).then((codesResp) => {
          expect(codesResp.status).to.eq(200);
          const allCodes = codesResp.body.codes;

          // Clean up any leftover codes from previous runs or conflicting code values.
          const codesPlanned = new Set([LOCAL_CODE1_VALUE, LOCAL_CODE2_VALUE]);
          const staleCodes = allCodes.filter(
            (c) => (c.code && codesPlanned.has(c.code)) ||
              (c.label && c.label.startsWith(TEST_LABEL_PREFIX)),
          );
          staleCodes.forEach((c) => {
            cy.deleteSpecificationIndicatorCode(c.id, false);
          });

          // Create first local indicator code
          cy.createSpecificationIndicatorCode(firstIndicator.id, CREATE_LOCAL_CODE1_PAYLOAD).then(
            (createResp1) => {
              expect(createResp1.status).to.eq(201);
              localCode1Id = createResp1.body.id;
              localCode1Label = createResp1.body.label;

              // Create second local indicator code
              cy.createSpecificationIndicatorCode(
                firstIndicator.id,
                CREATE_LOCAL_CODE2_PAYLOAD,
              ).then((createResp2) => {
                expect(createResp2.status).to.eq(201);
                localCode2Id = createResp2.body.id;

                // Choose a standard code label to duplicate later
                const standardCodes = allCodes.filter((c) => c.scope === 'standard');
                expect(
                  standardCodes.length,
                  'There should be at least one standard indicator code',
                ).to.be.greaterThan(0);
                // Prefer a standard label different from localCode1Label if possible
                const diffLabel = standardCodes.find((c) => c.label !== localCode1Label);
                chosenStandardLabel = (diffLabel || standardCodes[0]).label;
              });
            },
          );
        });
      });
    });
  });

  after('Cleanup - delete created local indicator codes and user', () => {
    if (user) {
      cy.getAdminToken();
      if (localCode1Id) {
        cy.deleteSpecificationIndicatorCode(localCode1Id, false);
      }
      if (localCode2Id) {
        cy.deleteSpecificationIndicatorCode(localCode2Id, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502974 Update Local Indicator Code of Standard field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502974', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Update localCode2 to duplicate localCode1 label
      const duplicateLocalLabelPayload = {
        code: LOCAL_CODE2_VALUE, // keep its code value
        label: localCode1Label, // duplicate label
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(localCode2Id, duplicateLocalLabelPayload).then(
        (resp1) => {
          expect(resp1.status, 'Step 1: Duplicate another local code label should succeed').to.eq(
            202,
          );
          expect(resp1.body.id).to.eq(localCode2Id);
          expect(resp1.body.label).to.eq(localCode1Label);
        },
      );

      // Step 2: Update same localCode2 to duplicate a STANDARD (LOC) indicator code label
      const duplicateStandardLabelPayload = {
        code: LOCAL_CODE2_VALUE,
        label: chosenStandardLabel,
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(localCode2Id, duplicateStandardLabelPayload).then(
        (resp2) => {
          expect(resp2.status, 'Step 2: Duplicate standard LOC code label should succeed').to.eq(
            202,
          );
          expect(resp2.body.id).to.eq(localCode2Id);
          expect(resp2.body.label).to.eq(chosenStandardLabel);
        },
      );

      // Step 3: GET indicator codes to verify presence and final state
      cy.getSpecificationIndicatorCodes(firstIndicator.id).then((getResp) => {
        expect(getResp.status, 'Step 3: GET indicator codes should succeed').to.eq(200);
        expect(getResp.body.codes).to.exist;

        const codes = getResp.body.codes;
        const standardCodes = codes.filter((c) => c.scope === 'standard');
        const localCodes = codes.filter((c) => c.scope === 'local');

        expect(
          standardCodes.length,
          'Standard LOC indicator codes exist after updates',
        ).to.be.greaterThan(0);
        expect(
          localCodes.find((c) => c.id === localCode1Id),
          'Local code 1 still present',
        ).to.exist;
        const updatedLocal2 = localCodes.find((c) => c.id === localCode2Id);
        expect(updatedLocal2, 'Updated local code 2 present').to.exist;
        expect(updatedLocal2.label, 'Local code 2 has label duplicated from standard code').to.eq(
          chosenStandardLabel,
        );
      });
    },
  );
});
