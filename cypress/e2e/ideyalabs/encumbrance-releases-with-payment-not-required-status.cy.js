import order from '../../support/ideyaLabs/orders';
import orderFragment from '../../support/fragments/orders/orders';
import orderLines from '../../support/fragments/orders/orderLines';
import receiving from '../../support/fragments/receiving/receiving';
import titleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import SettingsMenu from '../../support/fragments/settingsMenu';
import topMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const orderDetails = {
  searchByParameter: 'PO line number',
  enterPoLineNumber: '20692-1',
  checkOrderLineSearchResults: '20692-1',
  titleName: 'Approve rolled',
  caption: 'Done',
  enumeration: 'Electronic',
  poLineNumber: '20692-1',
};
const patronData = {
  notice1: 'Requested item - available',
  notice2: 'Test TLR',
  notice3: 'Requested item - available',
};



describe('Orders app ', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C378899 Encumbrance releases when receive piece for order with payment status "Payment Not Required" (Thunderjet)', { tags: [testTypes.Extended, devTeams.thunderjet] }, () => {
    cy.visit(topMenu.ordersPath);
    orderLines.clickOnOrderLines();
    orderLines.searchByParameter(
      orderDetails.searchByParameter,
      orderDetails.enterPoLineNumber
    );
    orderLines.checkOrderlineSearchResults(
      orderDetails.checkOrderLineSearchResults
    );
    orderLines.selectOrderline(orderDetails.checkOrderLineSearchResults);
    orderLines.receiveOrderLineViaActions();
    orderLines.selectreceivedTitleName(orderDetails.titleName);
    receiving.addPieceProcess(orderDetails.caption, orderDetails.enumeration);
    receiving.quickReceivePieceAdd(orderDetails.enumeration);
    receiving.clickOnPOLnumber(orderDetails.poLineNumber);
    orderFragment.selectFundIDFromthelist();
  });

  it('C350428 Patron notice (Vega)', { tags: [testTypes.Extended, devTeams.vega] }, () => {
    cy.visit(SettingsMenu.circulationTitleLevelRequestsPath);
    titleLevelRequests.selectConfirmationNoticeDropdown({
      notice1: patronData.notice1,
    });
    titleLevelRequests.selectCancelleationNoticeDropdown({
      notice2: patronData.notice2,
    });
    titleLevelRequests.selectExpirationNoticeDropdown({
      notice3: patronData.notice3,
    });
    titleLevelRequests.clickOnSaveButton();
    titleLevelRequests.checkUpdateTLRCalloutAppeared();
  });

  xit('C365619 Re-exported Order contains more than two PO lines is successfully exported in the next scheduled run (Thunderjet)', { tags: [testTypes.Extended, devTeams.thunderjet] }, () => {
    cy.visit(topMenu.ordersPath);
    order.switchToOrders();
    order.status();
    order.poNumberRecord();
    order.reExportActions();
    order.reExportOrderModal();
  });
});
