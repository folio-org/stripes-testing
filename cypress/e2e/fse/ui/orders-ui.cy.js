import TopMenu from '../../../support/fragments/topMenu';
import Orders from '../../../support/fragments/orders/orders';

describe('fse-orders - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    'TC195334 - verify that orders page is displayed',
    { tags: ['sanity', 'fse', 'ui', 'orders'] },
    () => {
      cy.visit(TopMenu.ordersPath);
      Orders.waitLoading();
    },
  );
});
