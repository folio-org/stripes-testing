import invoice from '../../support/fragments/ideyalabs/invoice';
import invoices from '../../support/fragments/invoices/invoices';
import TopMenu from '../../support/fragments/topMenu';
import dateTools from '../../support/utils/dateTools';

const RandomNumber = Math.floor(Math.random() * 9000) + 1000;
const orderOne = {
  templateName:'Adlibris book order (adlibris)',
  orderType:'One-time'
};
const orderOnePOLine = {
  title: 'test order1',
  fundID: 'Alpha FYRO (AFYRO)'

};
const orderTwo = {
  templateName:'Amazon book orders (Amazon-B)',
  orderType:'Ongoing'
};
const orderTwoPOLine = {
  title: 'test order2',
  fundID: 'PO Fund 1 (POF1)',
  price: '1',
  val1: '90',
  val2:'10'
};
const newInvoice = {
  invoiceDate:dateTools.getCurrentDate(),
  status:'Open',
  invoiceNumber: `123${RandomNumber}`,
  vendorName: '1517 THE LEGACY PROJECT',
  accountingCode:'1233',
  batchGroup: 'BG1'

};
const invoiceLines = {
  line1:'12320886456-1',
  line2:'12320886456-1',
  line3: '12320877456-1',
  line4: '12320873456-1'
};
const fundDistribution = {
  fundID1:'Alpha FYRO (AFYRO)',
  fundID2: 'Beta FYRO (BFYRO)'
};
const searchInvoiceNumber = {
  parameter: 'Keyword',
  value: '17210-4'
};
const fundID = 'Fund B (b)';


describe('C353566-Correct fund validation to approve invoice', () => {
  xit('Invoices App', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.ordersPath);
    invoice.createOrder(orderOne.orderType, orderOne.templateName);
    invoice.POlines(orderOnePOLine.title, orderOnePOLine.fundID);
    invoice.purchaseOrder();
    invoice.createAnotherOrder(orderTwo.orderType, orderTwo.templateName),
    invoice.POlinesForAnotherOrder(orderTwoPOLine.title, orderTwoPOLine.price, orderTwoPOLine.fundID, orderTwoPOLine.val1, orderTwoPOLine.val2)
    ,
    invoice.purchaseAnotherOrder();
    cy.visit(TopMenu.invoicesPath);
    invoices.createVendorInvoice(newInvoice);


    invoice.searchByNumber(newInvoice.invoiceNumber);
    invoice.selectInvoice(newInvoice.invoiceNumber);
    invoices.createInvoiceLineFromPol(invoiceLines.line1);
    invoices.applyConfirmationalPopup();
    invoices.applyConfirmationalPopup();
    invoices.createInvoiceLineFromPol(invoiceLines.line2);
    invoices.applyConfirmationalPopup();
    invoices.applyConfirmationalPopup();
    invoices.createInvoiceLineFromPol(invoiceLines.line3);
    invoices.applyConfirmationalPopup();
    invoices.applyConfirmationalPopup();
    invoices.createInvoiceLineFromPol(invoiceLines.line4);
    invoices.applyConfirmationalPopup(); // confirmation for 1st time
    invoices.applyConfirmationalPopup(); // confirmation for 2nd time
    invoice.addFundDistributionToLine2(fundDistribution.fundID1);
    invoice.addFundDistributionToLine4(fundDistribution.fundID2);
    invoice.adjustments();

    invoice.approveInvoice();
  });
  it('C368486 - Editing fund distribution in PO line when related Reviewed invoice exists', () => {
    cy.visit(TopMenu.orderLinesPath);
    invoice.searchByParameter(searchInvoiceNumber.parameter, searchInvoiceNumber.value);
    invoice.orderList(searchInvoiceNumber.value);
    invoice.PODetails(fundID);  // API getting failed while changing Fund ID
    invoice.selectCurrentEncumbrance();
    cy.visit(TopMenu.invoicesPath);
    invoice.openStatusAndClickCheckbox();
  });
});
