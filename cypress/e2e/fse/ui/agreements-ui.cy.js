import TopMenu from '../../../support/fragments/topMenu';
import SearchAgreements from '../../../support/fragments/agreements/searchAndFilterAgreements';
import NewAgreement from '../../../support/fragments/agreements/newAgreement';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';

describe('fse-agreements - UI for production tenants', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195280 - verify that agreements module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'agreements'] },
    () => {
      cy.visit(TopMenu.agreementsPath);
      SearchAgreements.verifyAgreementsFilterPane();
    },
  );
});

describe('fse-agreements - UI for non-production tenants', () => {
  const defaultAgreement = { ...NewAgreement.getdefaultAgreement() };

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  after('delete test data', () => {
    Agreements.getIdViaApi({ limit: 1000, query: `"name"=="${defaultAgreement.name}"` }).then(
      (id) => {
        Agreements.deleteViaApi(id);
      },
    );
  });

  it(
    `TCXXXXX - create new agreement ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['non-live', 'fse', 'ui', 'agreements'] },
    () => {
      cy.visit(TopMenu.agreementsPath);
      Agreements.waitLoadingThirdPane();
      // create agreement
      Agreements.createAndCheckFields(defaultAgreement);
      Agreements.checkAgreementPresented(defaultAgreement.name);
      AgreementViewDetails.verifyAgreementDetails(defaultAgreement);
      AgreementViewDetails.verifyLastUpdatedDate();
    },
  );
});
