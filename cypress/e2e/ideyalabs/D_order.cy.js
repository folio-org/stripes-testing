import orderLines from "../../support/fragments/orders/orderLines";
import ordersa from "../../support/a_ideyalabs/orders";
import receiving from "../../support/fragments/receiving/receiving";
import topMenu from "../../support/fragments/topMenu";
import SettingsMenu from "../../support/fragments/settingsMenu";
import titleLevelRequests from "../../support/fragments/settings/circulation/titleLevelRequests";


const OrderDetails={
  searchByParameter:'PO line number',
  EnterPoLineNumber:'20692-1',
  checkOrderlineSearchResults:'20692-1',
  TittleName:'Approve rolled',
  Pieces1:'xys',
  Pieces2:'Electronic',
  PoLineNumber:'20692-1',
  SelectFund:'Fund HBZ(HBZ)'
}
const PatronData={
  notice1:'Test TLR',
  notice2:'Request expired',
  notice3:'Test TLR'
}


describe("Orders app ", () => {
  xit('C378899-Encumbrance releases when receive piece for order with payment status ""Payment Not Required""', () => {
    cy.login(Cypress.env("diku_login"), Cypress.env("diku_password"));
    cy.visit(topMenu.ordersPath);
    orderLines.clickOnOrderLines();
    orderLines.searchByParameter(OrderDetails.searchByParameter, OrderDetails.EnterPoLineNumber);
    orderLines.checkOrderlineSearchResults(OrderDetails.checkOrderlineSearchResults);
    orderLines.selectOrderline(OrderDetails.checkOrderlineSearchResults);
    orderLines.receiveOrderLineViaActions();
    orderLines.selectreceivedTitleName(OrderDetails.TittleName);
    receiving.addPieceProcess(OrderDetails.Pieces1, OrderDetails.Pieces2);
    receiving.quickReceivePiece();
     receiving.clickOnPOLnumber(OrderDetails.PoLineNumber)
     orderLines.selectFund(OrderDetails.SelectFund)
  });
  it("C350428 Patron notice", () => {
    cy.visit(SettingsMenu.circulationTitleLevelRequestsPath);

    titleLevelRequests.SelectConfirmationNoticeDropdown({notice1:
     PatronData.notice1}
); //need to change the data "Test TLR"/Request expired

    titleLevelRequests.SelectCancelleationNoticeDropdown({notice2:
      PatronData.notice2}
    ); //need to change the data

    titleLevelRequests.SelectExpirationNoticeDropdown({notice3:
      PatronData.notice3}
    ); //need to change the data

    titleLevelRequests.clickOnSaveButton();
  });

  it("C365619 Re-exported Order contains more than two PO lines is successfully exported in the next scheduled run", () => {
    cy.visit(topMenu.ordersPath);
    ordersa.switchToOrders();
    ordersa.status();
    ordersa.poNumberRecord();
    ordersa.reExportActions();
    ordersa.reExportOrderModal();
  });
});
