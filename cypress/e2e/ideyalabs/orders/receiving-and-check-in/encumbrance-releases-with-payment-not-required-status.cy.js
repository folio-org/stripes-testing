import orderFragment from '../../../../support/fragments/orders/orders';
import orderLines from '../../../../support/fragments/orders/orderLines';
import receiving from '../../../../support/fragments/receiving/receiving';
import topMenu from '../../../../support/fragments/topMenu';
import testTypes from '../../../../support/dictionary/testTypes';

const orderDetails = {
  searchByParameter: 'PO line number',
  enterPoLineNumber: '20692-1',
  checkOrderLineSearchResults: '20692-1',
  titleName: 'Approve rolled',
  caption: 'Done',
  enumeration: 'Electronic',
  poLineNumber: '20692-1',
};

describe.skip('Orders: Receiving and Check-in ', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it(
    'C378899 Encumbrance releases when receive piece for order with payment status "Payment Not Required" (Thunderjet)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.ordersPath);
      orderLines.clickOnOrderLines();
      orderLines.searchByParameter(orderDetails.searchByParameter, orderDetails.enterPoLineNumber);
      orderLines.checkOrderlineSearchResults(orderDetails.checkOrderLineSearchResults);
      orderLines.selectOrderline(orderDetails.checkOrderLineSearchResults);
      orderLines.receiveOrderLineViaActions();
      orderLines.selectreceivedTitleName(orderDetails.titleName);
      receiving.addPieceProcess(orderDetails.caption, orderDetails.enumeration);
      receiving.quickReceivePieceAdd(orderDetails.enumeration);
      receiving.clickOnPOLnumber(orderDetails.poLineNumber);
      orderFragment.selectFundIDFromthelist();
    },
  );
});
