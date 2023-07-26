import invoice from '../../support/fragments/ideyalabs/invoice';
import invoices from '../../support/fragments/invoices/invoices';
import topMenu from '../../support/fragments/topMenu';
import dateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

const randomTitleOne = getRandomPostfix();
const randomTitleTwo = getRandomPostfix();

const orderOne = {
  templateName: 'Adlibris book order (adlibris)',
  orderType: 'One-time',
};

const orderOnePOLine = {
  title: `AutoTest_${randomTitleOne}`,
  fundID: 'Alpha FYRO (AFYRO)',
};

const orderTwo = {
  templateName: 'Amazon book orders (Amazon-B)',
  orderType: 'Ongoing',
};

const orderTwoPOLine = {
  title: `AutoTest_${randomTitleTwo}`,
  fundID: 'PO Fund 1 (POF1)',
  price: '1',
  valueOne: '90',
  valueTwo: '10',
};

const newInvoice = {
  invoiceDate: dateTools.getCurrentDate(),
  status: 'Open',
  invoiceNumber: getRandomPostfix(),
  vendorName: '1517 THE LEGACY PROJECT',
  accountingCode: '1233',
  batchGroup: 'BG1',
};

const invoiceLines = {
  invoiceLineOne: '12320886456-1',
  invoiceLineTwo: '12320886456-1',
  invoiceLineThree: '12320877456-1',
  invoiceLineFour: '12320873456-1',
};

const fundDistribution = {
  fundIDOne: 'Alpha FYRO (AFYRO)',
  fundIDTwo: 'Beta FYRO (BFYRO)',
};

const searchInvoiceNumber = {
  parameter: 'Keyword',
  value: '17210-4',
};

const fundID = 'Fund B (b)';

describe('C353566-Correct fund validation to approve invoice', () => {
  it('Invoices App', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(topMenu.ordersPath);
    invoice.createOrder(orderOne.orderType, orderOne.templateName);
    invoice.POLines(orderOnePOLine.title, orderOnePOLine.fundID);
    invoice.purchaseOrder();
    invoice.createAnotherOrder(orderTwo.orderType, orderTwo.templateName);
    invoice.POLinesForAnotherOrder(
      orderTwoPOLine.title,
      orderTwoPOLine.price,
      orderTwoPOLine.fundID,
      orderTwoPOLine.valueOne,
      orderTwoPOLine.valueTwo
    );
    invoice.purchaseAnotherOrder();
    cy.visit(topMenu.invoicesPath);
    invoices.createVendorInvoice(newInvoice);
    invoice.searchByNumber(newInvoice.invoiceNumber);
    invoice.selectInvoice(newInvoice.invoiceNumber);
    invoices.createInvoiceLineFromPol(invoiceLines.invoiceLineOne);
    invoices.applyConfirmationalPopup(); // confirmation for 1st time
    invoices.applyConfirmationalPopup(); // confirmation for 2nd time
    invoices.createInvoiceLineFromPol(invoiceLines.invoiceLineTwo);
    invoices.applyConfirmationalPopup(); // confirmation for 1st time
    invoices.applyConfirmationalPopup(); // confirmation for 2nd time
    invoices.createInvoiceLineFromPol(invoiceLines.invoiceLineThree);
    invoices.applyConfirmationalPopup(); // confirmation for 1st time
    invoices.applyConfirmationalPopup(); // confirmation for 2nd time
    invoices.createInvoiceLineFromPol(invoiceLines.invoiceLineFour);
    invoices.applyConfirmationalPopup(); // confirmation for 1st time
    invoices.applyConfirmationalPopup(); // confirmation for 2nd time
    invoice.addFundDistributionToLine2(fundDistribution.fundIDOne);
    invoice.addFundDistributionToLine4(fundDistribution.fundIDTwo);
    invoice.adjustments();
    invoice.approveInvoice();  //Approve API failure
  });

  it('C368486 - Editing fund distribution in PO line when related Reviewed invoice exists', () => {
    cy.visit(topMenu.orderLinesPath);
    invoice.searchByParameter(
      searchInvoiceNumber.parameter,
      searchInvoiceNumber.value
    );
    invoice.orderLinesResults();
    invoice.orderList(searchInvoiceNumber.value); 
    invoice.PODetails(fundID); // API getting failed while changing Fund ID in bugfest ENV
    invoice.selectCurrentEncumbrance();
    cy.visit(topMenu.invoicesPath);
    invoice.openStatusAndClickCheckbox();
  });
});
