import {
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  INVOICE_BATCH_GROUPS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceEditForm, Invoices, InvoiceView } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C889747_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C889747_Fund_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C889747_Organization_${postfix}`,
    };
    testData.invoice = {
      ...Invoices.getDefaultInvoice({ batchGroupName: INVOICE_BATCH_GROUPS.FOLIO }),
      invoiceDate: DateTools.getCurrentDate(),
    };
    testData.adjustmentDescription = `AT_C889747_Adjustment_${postfix}`;

    cy.getAdminToken();
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        allocated: 1000,
        fiscalYearId: fiscalYear.id,
        fundId: testData.fund.id,
      }).then((budget) => {
        testData.budget = budget;
      });
    });
    Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceEdit, CapabilitySets.uiInvoiceInvoiceCreate],
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Budgets.deleteViaApi(testData.budget.id, false);
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C889747 Fund distribution is cleared from the Invoice level adjustment when switching from the "Not Prorated" adjustment type to another type (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C889747'] },
    () => {
      // Step 1: Click "Actions" button, select "New" option
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();

      // Step 2: Fill in all required fields, add a not prorated adjustment
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        batchGroupName: testData.invoice.batchGroupName,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
        vendorName: testData.organization.name,
        paymentMethod: testData.invoice.paymentMethod,
        adjustment: {
          description: testData.adjustmentDescription,
          value: '10',
          prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
          relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
        },
      });
      cy.wait(2000); // Wait for the adjustment to be added to the invoice before proceeding

      // Step 3: Click "Add fund distribution" button
      InvoiceEditForm.fillInvoiceFields({ addAdjustmentFundDistribution: true });

      // Step 4: Leave "Fund ID" blank, change "Pro rate" to "By line", click "Save & close"
      cy.intercept('POST', '**/invoice/invoices*').as('createInvoice');
      InvoiceEditForm.fillInvoiceFields({ adjustmentProrate: ADJUSTMENT_PRORATE.BY_LINE });
      cy.wait(2000); // Wait for the adjustment to be updated before saving the invoice
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceLevelAdjustments: [
          { description: testData.adjustmentDescription, prorate: ADJUSTMENT_PRORATE.BY_LINE },
        ],
      });
      InvoiceView.checkInvoiceFundDistributionSectionAbsent();

      // Step 5: POST invoice response has no fund distributions in the adjustment
      cy.wait('@createInvoice').then(({ response }) => {
        testData.invoice.id = response.body.id;
        expect(response.body.adjustments[0].fundDistributions).to.have.lengthOf(0);

        // Step 6: Edit the invoice, change "Pro rate" to "Not prorated", select the fund
        InvoiceView.openInvoiceEditForm();
        InvoiceEditForm.fillInvoiceFields({
          adjustmentProrate: ADJUSTMENT_PRORATE.NOT_PRORATED,
          addAdjustmentFundDistribution: true,
          adjustmentFund: testData.fund,
        });
        cy.wait(2000); // Wait for the adjustment to be updated before saving the invoice

        // Step 7: Change "Pro rate" to "By amount", click "Save & close"
        InvoiceEditForm.fillInvoiceFields({ adjustmentProrate: ADJUSTMENT_PRORATE.BY_AMOUNT });
        cy.wait(2000); // Wait for the adjustment to be updated before saving the invoice
        InvoiceEditForm.clickSaveButton();
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceLevelAdjustments: [
            { description: testData.adjustmentDescription, prorate: ADJUSTMENT_PRORATE.BY_AMOUNT },
          ],
        });
        InvoiceView.checkInvoiceFundDistributionSectionAbsent();

        // Step 8: GET invoice response has no fund distributions in the adjustment
        Invoices.getInvoiceByIdViaApi(testData.invoice.id).then(({ adjustments }) => {
          expect(adjustments[0].fundDistributions).to.have.lengthOf(0);
        });
      });
    },
  );
});
