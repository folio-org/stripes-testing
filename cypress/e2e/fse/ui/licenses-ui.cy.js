import TopMenu from '../../../support/fragments/topMenu';
import Licenses from '../../../support/fragments/licenses/licenses';

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
    `TC195331 - verify that licenses page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'licenses', 'TC195331'] },
    () => {
      Licenses.waitLoading();
    },
  );
});
