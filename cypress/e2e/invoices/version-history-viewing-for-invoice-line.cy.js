import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ADJUSTMENT_DISTRIBUTION_TYPES,
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  EXPENSE_CLASS_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  NO_VALUE,
  ORDER_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import AcqVersionHistory from '../../support/fragments/acqVersionHistory';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import CancelInvoiceModal from '../../support/fragments/invoices/modal/cancelInvoiceModal';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { DateTools } from '../../support/utils';
import { formatDateTime } from '../../support/utils/acquisitions';
import getRandomPostfix from '../../support/utils/stringTools';
import { getFullName } from '../../support/utils/users';

describe('Invoices', () => {
  // Invoice version history pane reuses the order line pane id
  const invoiceVersionHistoryPane = 'order-line';
  const invoiceLineVersionHistoryPane = 'invoice-line-pane';
  const invoiceVersionView = 'invoice';
  const invoiceLineVersionView = 'invoice-line';
  const adjustmentChangedFields = [
    'Adjustment description',
    'Adjustment export to accounting',
    'Adjustment pro rate',
    'Adjustment relation to total',
    'Adjustment type',
    'Adjustment value',
  ];
  const firstLineChangedFields = [
    ...adjustmentChangedFields,
    'Description',
    'Expense class',
    'Fund code',
    'Fund ID',
    'Release encumbrance',
    'Subscription end date',
    'Subscription info',
    'Subscription start date',
    'Type',
    'Value',
  ];
  const thirdOrderLineChangedFields = [
    'Account number',
    'Accounting code',
    'Comment',
    'Description',
    'Expense class',
    'Fund code',
    'Fund ID',
    'PO line ID',
    'Quantity',
    'Sub-total',
    'Total',
    'Type',
    'Value',
  ];
  const releaseEncumbranceLabel = 'Release encumbrance';
  const invoiceLineStatusChangedField = 'Invoice line status';
  const adjustmentsAccordion = 'Invoice level adjustments';
  const fundDistributionAccordion = 'Fund distribution';
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C663321_Ledger_${postfix}`,
    };
    testData.funds = ['A', 'B'].map((descriptor) => ({
      ...Funds.getDefaultFund(),
      name: `AT_C663321_Fund_${descriptor}_${postfix}`,
      ledgerId: testData.ledger.id,
    }));
    testData.expenseClass = {
      ...ExpenseClasses.getDefaultExpenseClass(),
      name: `AT_C663321_ExpenseClass_${postfix}`,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C663321_Organization_${postfix}`,
    };
    testData.firstLine = {
      description: `AT_C663321_InvoiceLine_1_Description_${postfix}`,
      subscriptionInfo: `AT_C663321_SubscriptionInfo_${postfix}`,
      adjustmentDescription: `AT_C663321_Adjustment_${postfix}`,
      subscriptionStart: DateTools.getCurrentEndOfDay(),
      subscriptionEnd: DateTools.getCurrentEndOfDay().add(30, 'days'),
    };
    testData.secondLine = {
      description: `AT_C663321_InvoiceLine_2_Description_${postfix}`,
      comment: `AT_C663321_Comment_${postfix}`,
    };
    testData.cancellationNote = `AT_C663321_CancellationNote_${postfix}`;
    testData.budgets = [];
    testData.orderLines = [];

    cy.clearLocalStorage();
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);
    OrderLinesLimit.setPOLLimitViaApi(3);
    cy.getTenantLocaleApi().then((locale) => {
      testData.locale = locale;
    });
    cy.getAdminUserDetails().then((adminUser) => {
      testData.adminName = getFullName(adminUser);
    });

    // Fund A and Fund B with current budgets, expense class added to Fund B budget
    ExpenseClasses.createExpenseClassViaApi(testData.expenseClass).then((expenseClass) => {
      testData.expenseClass = expenseClass;
    });
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      testData.funds.forEach((fund, index) => {
        Funds.createViaApi(fund);
        Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          allocated: 1000,
          fiscalYearId: fiscalYear.id,
          fundId: fund.id,
          statusExpenseClasses:
            index === 1
              ? [
                {
                  status: EXPENSE_CLASS_STATUSES.ACTIVE,
                  expenseClassId: testData.expenseClass.id,
                },
              ]
              : [],
        }).then((budget) => {
          testData.budgets.push(budget);
        });
      });
    });
    Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });

    // Open order with three PO lines: #1 - Fund A, #2 - Fund B, #3 - no fund distribution
    cy.then(() => {
      const [fundA, fundB] = testData.funds;
      const fundDistributions = [
        [
          {
            code: fundA.code,
            fundId: fundA.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
        [
          {
            code: fundB.code,
            fundId: fundB.id,
            expenseClassId: testData.expenseClass.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
        [],
      ];

      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        fundDistributions.forEach((fundDistribution) => {
          OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 10,
              poLineEstimatedPrice: 10,
              fundDistribution,
            }),
          ).then((orderLine) => {
            testData.orderLines.push(orderLine);
          });
        });
        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
      });
    });

    // Invoice with Invoice line #1 (no PO line, Fund A) and Invoice line #2 (related to PO line #1)
    cy.then(() => {
      const [fundA] = testData.funds;

      Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        exportToAccounting: false,
      }).then((invoice) => {
        testData.invoice = invoice;

        Invoices.createInvoiceLineViaApi(
          Invoices.getDefaultInvoiceLine({
            invoiceId: invoice.id,
            invoiceLineStatus: invoice.status,
            fundDistributions: [
              {
                code: fundA.code,
                fundId: fundA.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
            subTotal: 10,
            releaseEncumbrance: false,
          }),
        ).then((invoiceLine) => {
          testData.firstLine.id = invoiceLine.id;
        });
        OrderLines.getOrderLineByIdViaApi(testData.orderLines[0].id).then((orderLine) => {
          Invoices.createInvoiceLineViaApi(
            Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              poLineId: orderLine.id,
              fundDistributions: orderLine.fundDistribution,
              subTotal: 10,
            }),
          ).then((invoiceLine) => {
            testData.secondLine.id = invoiceLine.id;
          });
        });
      });
    });

    // Edit Invoice line #1 and Invoice line #2
    cy.then(() => {
      const [fundA, fundB] = testData.funds;

      InvoiceLineDetails.getInvoiceLinesViaApi({ query: `id==${testData.firstLine.id}` }).then(
        ({ invoiceLines }) => {
          InvoiceLineDetails.updateInvoiceLineViaApi({
            ...invoiceLines[0],
            description: testData.firstLine.description,
            subscriptionInfo: testData.firstLine.subscriptionInfo,
            subscriptionStart: testData.firstLine.subscriptionStart.toISOString(),
            subscriptionEnd: testData.firstLine.subscriptionEnd.toISOString(),
            releaseEncumbrance: true,
            fundDistributions: [
              {
                code: fundB.code,
                fundId: fundB.id,
                expenseClassId: testData.expenseClass.id,
                distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                value: invoiceLines[0].subTotal,
              },
            ],
            adjustments: [
              {
                description: testData.firstLine.adjustmentDescription,
                value: 5,
                type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
                prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
                relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.INCLUDED_IN,
                exportToAccounting: false,
              },
            ],
          });
        },
      );
      InvoiceLineDetails.getInvoiceLinesViaApi({ query: `id==${testData.secondLine.id}` }).then(
        ({ invoiceLines }) => {
          InvoiceLineDetails.updateInvoiceLineViaApi({
            ...invoiceLines[0],
            poLineId: testData.orderLines[1].id,
            description: testData.secondLine.description,
            comment: testData.secondLine.comment,
            quantity: 2,
            subTotal: 20,
            fundDistributions: [
              {
                code: fundA.code,
                fundId: fundA.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 50,
              },
              {
                code: fundB.code,
                fundId: fundB.id,
                expenseClassId: testData.expenseClass.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 50,
              },
            ],
          });
        },
      );
    });

    // PO line #1 is deleted from the order
    cy.then(() => {
      OrderLines.deleteOrderLineViaApi(testData.orderLines[0].id);
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;
      // Version history card shows the user as "<last name>, <first name>"
      testData.userName = `${userProperties.personal.lastName}, ${userProperties.personal.firstName}`;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiInvoiceInvoiceDelete,
          CapabilitySets.uiInvoiceInvoiceApprove,
          CapabilitySets.uiInvoiceInvoiceCancel,
          CapabilitySets.uiInvoiceInvoicePay,
        ],
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    // Cancelled Invoice, Budgets, Funds, Ledger with transactions cannot be deleted
    Invoices.deleteInvoiceViaApi(testData.invoice.id, { failOnStatusCode: false });
    Orders.deleteOrderViaApi(testData.order.id, false);
    testData.budgets.forEach(({ id }) => Budgets.deleteViaApi(id, false));
    testData.funds.forEach(({ id }) => Funds.deleteFundViaApi(id, false));
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    ExpenseClasses.deleteExpenseClassViaApi(testData.expenseClass.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C663321 "Version history" viewing for Invoice line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C663321'] },
    () => {
      const [, secondOrderLine, thirdOrderLine] = testData.orderLines;
      const [, fundB] = testData.funds;
      // Fund column shows "<fund name>(<fund code>)"
      const fundBValue = `${fundB.name}(${fundB.code})`;
      const firstLineHighlightedFields = [
        testData.firstLine.description,
        testData.firstLine.subscriptionInfo,
        testData.firstLine.subscriptionStart.format('MM/DD/YYYY'),
        testData.firstLine.subscriptionEnd.format('MM/DD/YYYY'),
        releaseEncumbranceLabel,
        testData.firstLine.adjustmentDescription,
        '$5.00',
        ADJUSTMENT_PRORATE.NOT_PRORATED,
        ADJUSTMENT_RELATION_TO_TOTAL.INCLUDED_IN,
        fundBValue,
        testData.expenseClass.name,
        '10',
      ];
      const approvedByName = `${testData.user.personal.lastName}, ${testData.user.personal.firstName} ${testData.user.personal.middleName}`;

      cy.intercept('GET', `/audit-data/acquisition/invoice-line/${testData.firstLine.id}*`).as(
        'versionHistory',
      );

      // Step 1: Click on Invoice name link on "Invoices" pane
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceLines: [{ number: 1 }, { number: 2 }],
      });

      // Step 2: Click on "Invoice line #1" in "Invoice lines" accordion
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.checkInvoiceLineDetails({ title: '1' });

      // Step 3: Click "Version history" icon
      InvoiceLineDetails.openVersionHistory();
      cy.wait('@versionHistory').then(({ response }) => {
        const formatEventDate = ({ eventDate }) => formatDateTime(testData.locale, eventDate);

        testData.eventDates = response.body.invoiceLineAuditEvents.map(formatEventDate);
      });
      cy.then(() => {
        InvoiceLineDetails.checkVersionHistoryModeControls();
        AcqVersionHistory.verifyVersionsCount(invoiceLineVersionHistoryPane, 2);
        [{ isCurrent: true }, { isOriginal: true }].forEach((card, index) => {
          AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
            ...card,
            index,
            eventDate: testData.eventDates[index],
            source: testData.adminName,
          });
        });
        AcqVersionHistory.checkHighlightedFieldsInVersionView(
          invoiceLineVersionView,
          firstLineHighlightedFields,
        );
      });

      // Step 4: Click "Version history" icon on the last card
      AcqVersionHistory.selectVersionHistoryCard(invoiceLineVersionHistoryPane, { index: 1 });
      AcqVersionHistory.checkVersionHistoryCardIsActive(invoiceLineVersionHistoryPane, {
        index: 1,
      });
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 1,
        isOriginal: true,
        source: testData.adminName,
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceLineVersionView, []);

      // Step 5: Click "View this version" icon on the first card
      AcqVersionHistory.selectVersionHistoryCard(invoiceLineVersionHistoryPane, { index: 0 });
      AcqVersionHistory.checkVersionHistoryCardIsActive(invoiceLineVersionHistoryPane, {
        index: 0,
      });
      // More than 12 changed fields are hidden under "Show all"
      AcqVersionHistory.clickShowAllButtonInCard(invoiceLineVersionHistoryPane, { index: 0 });
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.adminName,
        changedFields: firstLineChangedFields,
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(
        invoiceLineVersionView,
        firstLineHighlightedFields,
      );

      // Step 6: Click "X" button on "Version history" pane
      AcqVersionHistory.closeVersionHistory(invoiceLineVersionHistoryPane);
      InvoiceLineDetails.checkInvoiceLineDetails({
        title: '1',
        invoiceLineInformation: [
          { key: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION, value: testData.firstLine.description },
        ],
      });

      // Step 7: Edit Invoice line #1 - delete adjustment, click "Save & close"
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.fillInvoiceLineFields({ deleteLineLevelAdjustments: 1 });
      InvoiceLineEditForm.clickSaveButton();

      // Step 8: Click on "Invoice line #1", click "Version history" icon
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.openVersionHistory();
      AcqVersionHistory.checkVersionHistoryCardIsActive(invoiceLineVersionHistoryPane, {
        index: 0,
      });
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: adjustmentChangedFields,
      });
      AcqVersionHistory.checkChangedFieldsCountInCard(invoiceLineVersionHistoryPane, {
        index: 0,
        count: adjustmentChangedFields.length,
      });
      AcqVersionHistory.checkAccordionInVersionView(invoiceLineVersionView, adjustmentsAccordion, {
        isPresent: false,
      });

      // Step 9: Close "Version history" pane, navigate to "Invoice line #2"
      AcqVersionHistory.closeVersionHistory(invoiceLineVersionHistoryPane);
      Invoices.backToInvoiceDetailsView();
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.checkInvoiceLineDetails({ title: '2' });

      // Step 10: Click "Version history" icon
      InvoiceLineDetails.openVersionHistory();
      InvoiceLineDetails.checkVersionHistoryModeControls();
      AcqVersionHistory.verifyVersionsCount(invoiceLineVersionHistoryPane, 2);
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.adminName,
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceLineVersionView, [
        testData.secondLine.description,
        secondOrderLine.poLineNumber,
        testData.secondLine.comment,
        '2',
        '$20.00',
        fundBValue,
        testData.expenseClass.name,
        '50%',
      ]);

      // Step 11: Click "Version history" icon on the last card
      AcqVersionHistory.selectVersionHistoryCard(invoiceLineVersionHistoryPane, { index: 1 });
      AcqVersionHistory.checkVersionHistoryCardIsActive(invoiceLineVersionHistoryPane, {
        index: 1,
      });
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 1,
        isOriginal: true,
        source: testData.adminName,
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceLineVersionView, []);
      AcqVersionHistory.checkFieldsInVersionView(invoiceLineVersionView, [
        { key: INVOICE_LINE_VIEW_FIELDS.PO_LINE_NUMBER, value: '-' },
      ]);

      // Step 12: Click "X" button on "Version history" pane
      AcqVersionHistory.closeVersionHistory(invoiceLineVersionHistoryPane);
      InvoiceLineDetails.checkInvoiceLineDetails({ title: '2' });

      // Step 13: Edit Invoice line #2 - delete PO line, click "Save & close"
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.clearField('POL number');
      InvoiceLineEditForm.clickSaveButton();

      // Step 14: Click on "Invoice line #2", click "Version history" icon
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.openVersionHistory();
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: ['PO line ID'],
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceLineVersionView, [NO_VALUE]);

      // Step 15: Close "Version history" pane, edit Invoice line #2 - add PO line #3, save
      AcqVersionHistory.closeVersionHistory(invoiceLineVersionHistoryPane);
      InvoiceLineDetails.openInvoiceLineEditForm();
      InvoiceLineEditForm.selectOrderLines(thirdOrderLine.poLineNumber);
      InvoiceLineEditForm.clickSaveButton();

      // Step 16: Click on "Invoice line #2", click "Version history" icon
      InvoiceView.selectInvoiceLine(1);
      InvoiceLineDetails.openVersionHistory();
      AcqVersionHistory.checkVersionHistoryCardIsActive(invoiceLineVersionHistoryPane, {
        index: 0,
      });
      // More than 12 changed fields are hidden under "Show all"
      AcqVersionHistory.clickShowAllButtonInCard(invoiceLineVersionHistoryPane, { index: 0 });
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: thirdOrderLineChangedFields,
      });
      // Selecting PO line #3 copies its title, quantity and cost and clears comment
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceLineVersionView, [
        thirdOrderLine.titleOrPackage,
        thirdOrderLine.poLineNumber,
        NO_VALUE,
        '1',
        '$10.00',
      ]);
      AcqVersionHistory.checkAccordionInVersionView(
        invoiceLineVersionView,
        fundDistributionAccordion,
        { isPresent: false },
      );

      // Step 17: Click title link on the second card
      AcqVersionHistory.clickVersionHistoryCardTitle(invoiceLineVersionHistoryPane, {
        index: 1,
      });
      AcqVersionHistory.checkVersionHistoryCardIsActive(invoiceLineVersionHistoryPane, {
        index: 1,
      });
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 1,
        source: testData.userName,
        changedFields: ['PO line ID'],
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceLineVersionView, [NO_VALUE]);

      // Step 18: Close "Version history" pane, delete Invoice line #2
      AcqVersionHistory.closeVersionHistory(invoiceLineVersionHistoryPane);
      InvoiceLineDetails.deleteInvoiceLine(2);
      InvoiceView.checkInvoiceDetails({ invoiceLines: [{ number: 1 }] });

      // Step 19: Click "Version history" icon on "Vendor invoice number" pane
      InvoiceView.openVersionHistory();
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceVersionView, ['$10.00']);
      AcqVersionHistory.checkFieldsInVersionView(invoiceVersionView, [
        { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '$10.00' },
        { key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT, value: '$10.00' },
      ]);

      // Step 20: Close "Version history" pane, approve the invoice
      AcqVersionHistory.closeVersionHistory(invoiceVersionHistoryPane);
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
        ],
      });

      // Step 21: Click "Version history" icon
      InvoiceView.openVersionHistory();
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceVersionView, [
        INVOICE_STATUSES.APPROVED,
        DateTools.getCurrentDate(),
        approvedByName,
      ]);

      // Step 22: Close "Version history" pane, navigate to "Invoice line #1", click "Version history" icon
      AcqVersionHistory.closeVersionHistory(invoiceVersionHistoryPane);
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.openVersionHistory();
      AcqVersionHistory.checkVersionHistoryCardIsActive(invoiceLineVersionHistoryPane, {
        index: 0,
      });
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: [invoiceLineStatusChangedField],
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceLineVersionView, [
        INVOICE_STATUSES.APPROVED,
      ]);

      // Step 23: Close "Version history" pane, go back, pay the invoice
      AcqVersionHistory.closeVersionHistory(invoiceLineVersionHistoryPane);
      Invoices.backToInvoiceDetailsView();
      InvoiceView.payInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });

      // Step 24: Click "Version history" icon
      InvoiceView.openVersionHistory();
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceVersionView, [
        INVOICE_STATUSES.PAID,
        DateTools.getCurrentDate(),
      ]);

      // Step 25: Close "Version history" pane, navigate to "Invoice line #1", click "Version history" icon
      AcqVersionHistory.closeVersionHistory(invoiceVersionHistoryPane);
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.openVersionHistory();
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: [invoiceLineStatusChangedField],
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceLineVersionView, [
        INVOICE_STATUSES.PAID,
      ]);

      // Step 26: Close "Version history" pane, go back, cancel the invoice
      AcqVersionHistory.closeVersionHistory(invoiceLineVersionHistoryPane);
      Invoices.backToInvoiceDetailsView();
      InvoiceView.clickCancelInActionsMenu();
      CancelInvoiceModal.verifyModalView();
      CancelInvoiceModal.fillInCancelationNote(testData.cancellationNote);
      CancelInvoiceModal.clickSubmitButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
        ],
      });

      // Step 27: Click "Version history" icon
      InvoiceView.openVersionHistory();
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceVersionView, [
        INVOICE_STATUSES.CANCELLED,
        testData.cancellationNote,
      ]);
      AcqVersionHistory.checkFieldsInVersionView(invoiceVersionView, [
        { key: INVOICE_VIEW_FIELDS.CANCELLATION_NOTE, value: testData.cancellationNote },
      ]);

      // Step 28: Close "Version history" pane, navigate to "Invoice line #1", click "Version history" icon
      AcqVersionHistory.closeVersionHistory(invoiceVersionHistoryPane);
      InvoiceView.selectInvoiceLine(0);
      InvoiceLineDetails.openVersionHistory();
      AcqVersionHistory.assertVersionHistoryCard(invoiceLineVersionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: [invoiceLineStatusChangedField],
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(invoiceLineVersionView, [
        INVOICE_STATUSES.CANCELLED,
      ]);
    },
  );
});
