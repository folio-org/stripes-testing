
import orderLines from '../../support/fragments/orders/orderLines';
import ordersa from '../../support/a_ideyalabs/orders';
import receiving from '../../support/fragments/receiving/receiving';
import topMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import titleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';

describe('Orders app ', () => {
  it('C378899-Encumbrance releases when receive piece for order with payment status ""Payment Not Required""', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(topMenu.ordersPath);
    orderLines.clickOnOrderLines();
    orderLines.searchByParameter('PO line number', '20692-1');
    orderLines.checkOrderlineSearchResults('20692-1');
    orderLines.selectOrderline('20692-1');
    orderLines.receiveOrderLineViaActions();
    orderLines.selectreceivedTitleName('Approve rolled');
    receiving.addPieceProcess('xys', 'Electronic');
    receiving.quickReceivePiece();
    //  receiving.clickOnPOLnumber("20692-1")
    //  orderLines.selectFund("HBZ-HBZ2024")
  });
  it('C350428 Patron notice', () => {
    cy.visit(SettingsMenu.circulationTitleLevelRequestsPath);

    titleLevelRequests.SelectConfirmationNoticeDropdown({
      notice1: 'Test TLR',
    }); // need to change the data "Test TLR"/Request expired

    titleLevelRequests.SelectCancelleationNoticeDropdown({
      notice2: 'Test TLR',
    }); // need to change the data

    titleLevelRequests.SelectExpirationNoticeDropdown({
      notice3: 'Test TLR',
    }); // need to change the data

    titleLevelRequests.clickOnSaveButton();
  });

  it('C365619 Re-exported Order contains more than two PO lines is successfully exported in the next scheduled run', () => {
    cy.visit(topMenu.ordersPath);
    ordersa.switchToOrders();
    ordersa.status();
    ordersa.poNumberRecord();
    ordersa.reExportActions();
    ordersa.reExportOrderModal();
  });
});
