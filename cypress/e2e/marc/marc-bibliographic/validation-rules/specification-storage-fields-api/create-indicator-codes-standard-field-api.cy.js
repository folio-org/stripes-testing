/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  findStandardField,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Indicator Code of Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  const STANDARD_FIELD_TAG = '243'; // Collective Uniform Title

  let user;
  let bibSpecId;
  let standardField;
  let indicator1;
  let indicator2;
  let createdIndicatorCode1Id;
  let createdIndicatorCode2Id;

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;
      });
    });
  });

  after('Delete created indicator codes and test user', () => {
    if (createdIndicatorCode1Id || createdIndicatorCode2Id) {
      cy.getAdminToken();
      if (createdIndicatorCode1Id) {
        cy.deleteSpecificationIndicatorCode(createdIndicatorCode1Id, false);
      }
      if (createdIndicatorCode2Id) {
        cy.deleteSpecificationIndicatorCode(createdIndicatorCode2Id, false);
      }
    }
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499672 Create Indicator code of Standard field for MARC bib spec (API) (spitfire)',
    { tags: ['C499672', 'criticalPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      cy.getSpecificationFields(bibSpecId).then((response) => {
        validateApiResponse(response, 200);
        standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);

        // Get indicators for the standard field
        cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
          validateApiResponse(indicatorsResp, 200);

          const indicators = indicatorsResp.body.indicators;
          indicator1 = indicators.find((ind) => ind.order === 1);
          indicator2 = indicators.find((ind) => ind.order === 2);

          expect(indicator1, 'Indicator 1 exists').to.exist;
          expect(indicator2, 'Indicator 2 exists').to.exist;

          // Step 1: Create indicator code for Indicator 1
          const indicator1CodePayload = {
            code: 'z',
            label: 'Created indicator code for 243 field',
            deprecated: false,
          };

          cy.createSpecificationIndicatorCode(indicator1.id, indicator1CodePayload).then(
            (code1Resp) => {
              validateApiResponse(code1Resp, 201);
              createdIndicatorCode1Id = code1Resp.body.id;
              expect(code1Resp.body).to.include({
                indicatorId: indicator1.id,
                code: indicator1CodePayload.code,
                label: indicator1CodePayload.label,
                deprecated: false,
                scope: 'local',
              });

              // Step 2: Create indicator code for Indicator 2 (without deprecated field)
              const indicator2CodePayload = {
                code: 'y',
                label: 'Created indicator code for 243 field',
              };

              cy.createSpecificationIndicatorCode(indicator2.id, indicator2CodePayload).then(
                (code2Resp) => {
                  validateApiResponse(code2Resp, 201);
                  createdIndicatorCode2Id = code2Resp.body.id;
                  expect(code2Resp.body).to.include({
                    indicatorId: indicator2.id,
                    code: indicator2CodePayload.code,
                    label: indicator2CodePayload.label,
                    deprecated: false,
                    scope: 'local',
                  });

                  // Step 3: Verify indicator 1 codes exist via GET request
                  cy.getSpecificationIndicatorCodes(indicator1.id).then((getCodes1Resp) => {
                    validateApiResponse(getCodes1Resp, 200);

                    // Response should contain both local (created) and standard (LOC) codes
                    expect(getCodes1Resp.body.codes).to.exist;
                    expect(getCodes1Resp.body.codes).to.have.length.greaterThan(0);

                    // Find the created local code
                    const foundLocalCode1 = getCodes1Resp.body.codes.find(
                      (code) => code.id === createdIndicatorCode1Id,
                    );
                    expect(foundLocalCode1, 'Created indicator 1 code found in response').to.exist;
                    expect(foundLocalCode1.scope).to.eq('local');

                    // Verify standard codes exist from LOC
                    const standardCodes1 = getCodes1Resp.body.codes.filter(
                      (code) => code.scope === 'standard',
                    );
                    expect(standardCodes1.length).to.be.greaterThan(0);

                    // Step 4: Verify indicator 2 codes exist via GET request
                    cy.getSpecificationIndicatorCodes(indicator2.id).then((getCodes2Resp) => {
                      validateApiResponse(getCodes2Resp, 200);
                      expect(getCodes2Resp.body.codes).to.exist;
                      expect(getCodes2Resp.body.codes).to.have.length.greaterThan(0);

                      const foundLocalCode2 = getCodes2Resp.body.codes.find(
                        (code) => code.id === createdIndicatorCode2Id,
                      );
                      expect(foundLocalCode2).to.exist;

                      const standardCodes2 = getCodes2Resp.body.codes.filter(
                        (code) => code.scope === 'standard',
                      );
                      expect(standardCodes2.length).to.be.greaterThan(0);
                    });
                  });
                },
              );
            },
          );
        });
      });
    },
  );
});
