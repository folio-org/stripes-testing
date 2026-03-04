import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('fse-copycat for production tenants', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195638 - Get all z3950 target profiles for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'copycat', 'loc', 'TC195638'] },
    () => {
      Z3950TargetProfiles.getAllTargetProfiles().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});

describe('fse-copycat for non-production tenants', () => {
  const targetProfileName = `TC195640 autotest profile${getRandomPostfix()}`;

  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  after('delete test data', () => {
    Z3950TargetProfiles.getTargetProfileIdViaApi({ query: `name="${targetProfileName}"` }).then(
      (profileId) => {
        Z3950TargetProfiles.deleteTargetProfileViaApi(profileId);
      },
    );
  });

  it(
    `TC195640 - Create and delete z3950 target profile for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'api', 'copycat', 'TC195640'] },
    () => {
      Z3950TargetProfiles.createNewZ3950TargetProfileViaApi(targetProfileName).then((profileId) => {
        cy.expect(profileId).to.not.be.oneOf([null, '']);
      });
    },
  );
});
