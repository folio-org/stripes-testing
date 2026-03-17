import TopMenu from '../../../support/fragments/topMenu';
import Orders from '../../../support/fragments/orders/orders';

describe('fse-orders - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.ordersPath,
      waiter: Orders.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195334 - verify that orders page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'orders', 'TC195334'] },
    () => {
      Orders.waitLoading();
    },
  );
});
