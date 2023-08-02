import order from '../../../../support/ideyaLabs/orders';
import topMenu from '../../../../support/fragments/topMenu';
import testTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';

describe('Orders: Receiving and Check-in ', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C365619 Re-exported Order contains more than two PO lines is successfully exported in the next scheduled run (Thunderjet)', { tags: [testTypes.ideaLabsTests, devTeams.thunderjet] }, () => {
    cy.visit(topMenu.ordersPath);
    order.switchToOrders();
    order.status();
    order.poNumberRecord();
    order.reExportActions();
    order.reExportOrderModal();
  });
});
