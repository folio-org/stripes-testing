import {
  ADJUSTMENT_DISTRIBUTION_TYPES,
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import {
  InvoiceEditForm,
  InvoiceLineDetails,
  Invoices,
  InvoiceView,
} from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C1292041_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C1292041_Fund_A_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C1292041_Organization_${postfix}`,
    };
    testData.fundDistributions = [
      {
        code: testData.fund.code,
        fundId: testData.fund.id,
        distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
        value: 100,
      },
    ];
    testData.invoiceAdjustments = [
      {
        description: `AT_C1292041_InvoiceAdjustment_1_${postfix}`,
        value: 10,
        type: ADJUSTMENT_DISTRIBUTION_TYPES.PERCENTAGE,
        prorate: ADJUSTMENT_PRORATE.BY_AMOUNT,
        relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
        exportToAccounting: false,
      },
      {
        description: `AT_C1292041_InvoiceAdjustment_2_${postfix}`,
        value: 20,
        type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
        prorate: ADJUSTMENT_PRORATE.BY_LINE,
        relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.INCLUDED_IN,
        exportToAccounting: false,
      },
      {
        description: `AT_C1292041_InvoiceAdjustment_3_${postfix}`,
        value: 30,
        type: ADJUSTMENT_DISTRIBUTION_TYPES.PERCENTAGE,
        prorate: ADJUSTMENT_PRORATE.BY_QUANTITY,
        relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.SEPARATE_FROM,
        exportToAccounting: false,
      },
      {
        description: `AT_C1292041_InvoiceAdjustment_4_${postfix}`,
        value: 40,
        type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
        prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
        relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
        exportToAccounting: false,
        fundDistributions: testData.fundDistributions,
      },
    ];
    testData.lineAdjustments = [
      {
        description: `AT_C1292041_LineAdjustment_1_${postfix}`,
        value: 10,
        type: ADJUSTMENT_DISTRIBUTION_TYPES.PERCENTAGE,
        prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
        relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
        exportToAccounting: false,
      },
      {
        description: `AT_C1292041_LineAdjustment_2_${postfix}`,
        value: 20,
        type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
        prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
        relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.INCLUDED_IN,
        exportToAccounting: false,
      },
      {
        description: `AT_C1292041_LineAdjustment_3_${postfix}`,
        value: 30,
        type: ADJUSTMENT_DISTRIBUTION_TYPES.PERCENTAGE,
        prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
        relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.SEPARATE_FROM,
        exportToAccounting: false,
      },
    ];
    testData.updatedInvoiceAdjustmentDescription = `AT_C1292041_InvoiceAdjustment_1_updated_${postfix}`;
    testData.updatedLineAdjustmentDescription = `AT_C1292041_LineAdjustment_1_updated_${postfix}`;

    cy.getAdminToken();
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      testData.fiscalYear = fiscalYear;

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

    // Invoice with four invoice-level adjustments and one invoice line with three line-level ones
    cy.then(() => {
      Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYear.id,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        exportToAccounting: false,
        adjustments: testData.invoiceAdjustments,
      }).then((invoice) => {
        testData.invoice = invoice;

        Invoices.createInvoiceLineViaApi({
          ...Invoices.getDefaultInvoiceLine({
            invoiceId: invoice.id,
            invoiceLineStatus: invoice.status,
            fundDistributions: testData.fundDistributions,
            accountingCode: testData.organization.erpCode,
            subTotal: 100,
            releaseEncumbrance: true,
          }),
          adjustments: testData.lineAdjustments,
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiInvoiceInvoiceEdit],
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
    'C1292041 Displaying invoice-level and invoice line-level adjustments on the invoice and invoice line edit pages (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1292041'] },
    () => {
      const [invoiceAdjustment1, invoiceAdjustment2, invoiceAdjustment3, invoiceAdjustment4] =
        testData.invoiceAdjustments;
      const [lineAdjustment1, lineAdjustment2, lineAdjustment3] = testData.lineAdjustments;
      // On the invoice line edit page line-level adjustments go first, then invoice-level ones
      const lineLevelIndexes = [0, 1, 2];
      const invoiceLevelIndexes = [3, 4, 5];
      // Invoice-level adjustments after adjustment #1 is edited in step 5
      const updatedInvoiceLevelAdjustments = [
        {
          description: testData.updatedInvoiceAdjustmentDescription,
          value: '$20.00',
          prorate: ADJUSTMENT_PRORATE.BY_LINE,
          relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.INCLUDED_IN,
        },
        {
          description: invoiceAdjustment2.description,
          value: '$20.00',
          prorate: invoiceAdjustment2.prorate,
          relationToTotal: invoiceAdjustment2.relationToTotal,
        },
        {
          description: invoiceAdjustment3.description,
          value: '30%',
          prorate: invoiceAdjustment3.prorate,
          relationToTotal: invoiceAdjustment3.relationToTotal,
        },
        {
          description: invoiceAdjustment4.description,
          value: '$40.00',
          prorate: invoiceAdjustment4.prorate,
          relationToTotal: invoiceAdjustment4.relationToTotal,
        },
      ];

      // Step 1: Click on the invoice from preconditions
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$100.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$60.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$160.00' },
        ],
        invoiceLines: [
          { quantity: '1', subTotal: '$100.00', adjustments: '$20.00', total: '$120.00' },
        ],
        invoiceLevelAdjustments: [
          {
            description: invoiceAdjustment1.description,
            value: '10%',
            prorate: invoiceAdjustment1.prorate,
            relationToTotal: invoiceAdjustment1.relationToTotal,
          },
          {
            description: invoiceAdjustment2.description,
            value: '$20.00',
            prorate: invoiceAdjustment2.prorate,
            relationToTotal: invoiceAdjustment2.relationToTotal,
          },
          {
            description: invoiceAdjustment3.description,
            value: '30%',
            prorate: invoiceAdjustment3.prorate,
            relationToTotal: invoiceAdjustment3.relationToTotal,
          },
          {
            description: invoiceAdjustment4.description,
            value: '$40.00',
            prorate: invoiceAdjustment4.prorate,
            relationToTotal: invoiceAdjustment4.relationToTotal,
          },
        ],
      });

      // Step 2: Click "Actions" button, select "Edit" option
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.checkAdjustmentsCount(4);

      // Step 3: Expand the "Pro rate" dropdown for any adjustment
      InvoiceEditForm.checkAdjustmentSelectOptions('prorate', {
        included: Object.values(ADJUSTMENT_PRORATE),
      });

      // Step 4: Expand the "Relation to total" dropdown for any prorated adjustment
      InvoiceEditForm.checkAdjustmentSelectOptions('relationToTotal', {
        included: Object.values(ADJUSTMENT_RELATION_TO_TOTAL),
      });

      // Step 5: Edit invoice-level adjustment #1, click "Save & close" button
      InvoiceEditForm.fillInvoiceFields({
        adjustment: {
          index: 0,
          description: testData.updatedInvoiceAdjustmentDescription,
          value: '20',
          type: '$',
          prorate: ADJUSTMENT_PRORATE.BY_LINE,
          relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.INCLUDED_IN,
        },
      });
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$100.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$50.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$150.00' },
        ],
        invoiceLines: [
          { quantity: '1', subTotal: '$100.00', adjustments: '$10.00', total: '$110.00' },
        ],
        invoiceLevelAdjustments: updatedInvoiceLevelAdjustments,
      });

      // Step 6: Click on the invoice line, all adjustments except not prorated #4 are displayed
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({
        adjustments: [
          { description: testData.updatedInvoiceAdjustmentDescription },
          { description: invoiceAdjustment2.description },
          { description: invoiceAdjustment3.description },
          { description: lineAdjustment1.description },
          { description: lineAdjustment2.description },
          { description: lineAdjustment3.description },
        ],
      });
      InvoiceLineDetails.checkAdjustmentsCount(6);

      // Step 7: Click "Actions" button, select "Edit" option
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkAdjustmentsCount(6);
      InvoiceLineEditForm.checkAdjustmentsEditable({
        editable: lineLevelIndexes,
        readOnly: invoiceLevelIndexes,
      });

      // Step 8: Expand the "Relation to total" dropdown for all invoice line-level adjustments
      lineLevelIndexes.forEach((index) => {
        InvoiceLineEditForm.checkAdjustmentSelectOptions(
          'relationToTotal',
          { included: Object.values(ADJUSTMENT_RELATION_TO_TOTAL) },
          index,
        );
      });

      // Step 9: Edit invoice line-level adjustment #1, click "Save & close" button
      InvoiceLineEditForm.fillInvoiceLineFields({
        adjustment: {
          index: 0,
          description: testData.updatedLineAdjustmentDescription,
          value: '20',
          type: '$',
          relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.INCLUDED_IN,
          exportToAccounting: true,
        },
      });
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$100.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$40.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$140.00' },
        ],
        invoiceLines: [
          { quantity: '1', subTotal: '$100.00', adjustments: '$0.00', total: '$100.00' },
        ],
        invoiceLevelAdjustments: updatedInvoiceLevelAdjustments,
      });

      // Step 10: Click on the invoice line, click "Actions" button, select "Edit" option
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.checkAdjustmentsCount(6);
      InvoiceLineEditForm.checkAdjustmentsEditable({
        editable: lineLevelIndexes,
        readOnly: invoiceLevelIndexes,
      });

      // Step 11: Remove all invoice line-level adjustments, invoice-level ones can not be removed
      InvoiceLineEditForm.fillInvoiceLineFields({ deleteLineLevelAdjustments: 3 });
      InvoiceLineEditForm.checkAdjustmentsCount(3);
      InvoiceLineEditForm.checkAdjustmentsEditable({ readOnly: lineLevelIndexes });

      // Step 12: Click "Save & close" button
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$100.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$40.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$140.00' },
        ],
        invoiceLines: [
          { quantity: '1', subTotal: '$100.00', adjustments: '$0.00', total: '$100.00' },
        ],
        invoiceLevelAdjustments: updatedInvoiceLevelAdjustments,
      });

      // Step 13: Edit the invoice, remove all invoice-level adjustments, click "Save & close"
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.fillInvoiceFields({ deleteAdjustments: 4 });
      InvoiceEditForm.checkAdjustmentsCount(0);
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$100.00' },
          { key: INVOICE_VIEW_FIELDS.TOTAL_ADJUSTMENTS, value: '$0.00' },
          { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$100.00' },
        ],
        invoiceLines: [
          { quantity: '1', subTotal: '$100.00', adjustments: '$0.00', total: '$100.00' },
        ],
      });
      InvoiceView.checkInvoiceLevelAdjustmentsSectionAbsent();

      // Step 14: Click on the invoice line, "Adjustments" accordion is blank
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.waitLoading();
      InvoiceLineDetails.checkInvoiceLineDetails({ adjustments: [] });
    },
  );
});
