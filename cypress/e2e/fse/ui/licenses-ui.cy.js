import TopMenu from '../../../support/fragments/topMenu';
import Licenses from '../../../support/fragments/licenses/licenses';
import Amendments from '../../../support/fragments/licenses/amendments';
import SearchAndFilterLicenses from '../../../support/fragments/licenses/searchAndFilterLicenses';
import SearchAndFilterAmendments from '../../../support/fragments/licenses/searchAndFilterAmendments';

describe('fse-licenses - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.licensesPath,
      waiter: Licenses.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195331 - verify that licenses page is displayed for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'ui', 'licenses', 'TC195331'] },
    () => {
      Licenses.waitLoading();
      SearchAndFilterLicenses.verifyAcquisitionUnitsFilterPresent();
      Amendments.openAmendmentsTab();
      Amendments.waitLoading();
      SearchAndFilterAmendments.verifyAcquisitionUnitsFilterPresent();
    },
  );
});
