import { getAuthoritySpec, getBibliographicSpec } from '../../../support/api/specifications-helper';

const UNDEFINED_RULE_NAMES = ['Undefined Field', 'Undefined Subfield', 'Undefined Indicator Code'];

describe('fse-specification-storage', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195707 - Get a collection of specifications for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['ramsons', 'fse', 'api', 'sanity', 'specification-storage', 'loc', 'TC195707'] },
    () => {
      cy.checkSpecificationStorageApi().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('specifications');
        cy.expect(response.body).to.have.property('totalRecords');
      });
    },
  );

  it(
    `FDOPS-6487 - MARC undefined validation rules default to disabled for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'sanity', 'specification-storage', 'trillium', 'FDOPS-6487'] },
    () => {
      const verifyUndefinedRulesDisabled = (spec) => {
        cy.getSpecificationRules(spec.id).then(({ body }) => {
          UNDEFINED_RULE_NAMES.forEach((ruleName) => {
            const rule = body.rules.find((r) => r.name === ruleName);
            // eslint-disable-next-line no-unused-expressions
            cy.expect(rule, `${ruleName} rule exists`).to.exist;
            cy.expect(rule.enabled).to.eq(false);
          });
        });
      };

      getBibliographicSpec().then(verifyUndefinedRulesDisabled);
      getAuthoritySpec().then(verifyUndefinedRulesDisabled);
    },
  );
});
