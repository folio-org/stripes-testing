import uuid from 'uuid';

import { MultiColumnListHeader } from '../../../../interactors';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ENCUMBRANCE_STATUSES,
  EXPENSE_CLASS_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
  SORT_DIRECTIONS,
  TRANSACTION_RESULTS_FILTERS,
  TRANSACTION_SOURCE_TYPES,
  TRANSACTION_TYPES,
  TRANSACTION_LIST_COLUMNS,
  TRANSACTION_DETAIL_FIELDS,
} from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
  TransactionDetails,
  Transactions,
  Transfers,
} from '../../../support/fragments/finance';
import Invoices from '../../../support/fragments/invoices/invoices';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import ExpenseClasses from '../../../support/fragments/settings/finance/expenseClasses';
import { ExecutionFlowManager } from '../../../support/utils';

const R = {
  FISCAL_YEAR: 'fiscalYear',
  LEDGER: 'ledger',
  FUND_A: 'fundA',
  FUND_B: 'fundB',
  BUDGET_A: 'budgetA',
  BUDGET_B: 'budgetB',
  EXPENSE_CLASS_A: 'expenseClassA',
  EXPENSE_CLASS_B: 'expenseClassB',
  ORG: 'organization',
  ORDER_1: 'order1',
  ORDER_2: 'order2',
  ORDER_LINE_1: 'orderLine1',
  ORDER_LINE_2: 'orderLine2',
  INVOICE_1: 'invoice1',
  INVOICE_2: 'invoice2',
  INVOICE_3: 'invoice3',
  INVOICE_4: 'invoice4',
  TAGS: 'tags',
  USER: 'user',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ACQUISITION_METHOD: 'acquisitionMethod',
  LOCALE: 'locale',
};

const { ALLOCATION, CREDIT, ENCUMBRANCE, PAYMENT, PENDING_PAYMENT, TRANSFER } = TRANSACTION_TYPES;

describe('Finance', () => {
  describe('Transactions', () => {
    const flow = new ExecutionFlowManager();

    before('Create C934300 preconditions', () => {
      cy.getAdminToken();
      cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

      const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

      flow
        .step(steps.createFiscalYear) // Precondition 1: Active Fiscal year including current date.
        .step(steps.createLedger) // Precondition 2: Active Ledger related to the fiscal year.
        .step(steps.createExpenseClassesForBudgetA) // Precondition 3-4: Create expense classes with different names for testing expense class filter.
        .step(steps.createFundsAndBudgets) // Precondition 3: Active Fund A and Fund B with current budgets.
        .step(steps.createTaggedAllocationTransactions) // Precondition 5: Allocation increased/decreased with different tags.
        .step(steps.createTransfers) // Precondition 6: Money transfer between Fund A and Fund B.
        .step(steps.createOrganization) // Precondition 7 support: Vendor/source data for Order #1 and #2.
        .step(steps.fetchLocation) // Precondition 7 support: Location required for PO lines.
        .step(steps.fetchMaterialType) // Precondition 7 support: Material type required for PO lines.
        .step(steps.fetchAcquisitionMethod) // Precondition 7 support: Acquisition method for created PO lines.
        .step(steps.createOrder1WithLineAndOpen) // Precondition 7: One-time Order #1 in Open status with PO line.
        .step(steps.createOrder2WithLineAndOpen) // Precondition 8: Ongoing Order #2 in Open status with PO line.
        .step(steps.createInvoice1AndApprove) // Preconditions 9-10: Invoice #1 created and approved.
        .step(steps.createInvoice2AndPay) // Preconditions 11-12: Invoice #2 created, approved, and paid.
        .step(steps.createInvoice3AndPay) // Preconditions 13-14: Credit Invoice #3 created, approved, and paid.
        .step(steps.createInvoice4AndApprove) // Preconditions 15-16: Invoice #4 created and approved.
        .step(steps.createAuthorizedUser) // Precondition 17: Authorized user with Finance Fund-Budget view capability.
        .step(steps.loginAsAuthorizedUser) // Precondition 18 (part 1): Authorized user is logged in.
        .step(steps.openFundADetailsForAuthorizedUser); // Precondition 19: User is in Finance with Fund A details open.
    });

    after('Delete C934300 data (what can be deleted)', () => {
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C934300 Sort and filter transactions by different parameters (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C934300'] },
      () => {
        const { orderLine1, orderLine2, invoice1, invoice2, invoice3, expenseClassA, tags } =
          flow.ctx();

        const allTransactionsInList = [
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: PENDING_PAYMENT }],
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: CREDIT }],
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: PAYMENT }],
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: PENDING_PAYMENT }],
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: ENCUMBRANCE }],
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: ENCUMBRANCE }],
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: TRANSFER }],
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: TRANSFER }],
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: ALLOCATION }],
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: ALLOCATION }],
          [{ column: TRANSACTION_LIST_COLUMNS.TYPE, content: ALLOCATION }],
        ];

        const expenseClassFilteredTransactions = [
          [
            { column: TRANSACTION_LIST_COLUMNS.TYPE, content: CREDIT },
            { column: TRANSACTION_LIST_COLUMNS.SOURCE, content: TRANSACTION_SOURCE_TYPES.INVOICE },
          ],
          [
            { column: TRANSACTION_LIST_COLUMNS.TYPE, content: PAYMENT },
            { column: TRANSACTION_LIST_COLUMNS.SOURCE, content: TRANSACTION_SOURCE_TYPES.INVOICE },
          ],
          [
            { column: TRANSACTION_LIST_COLUMNS.TYPE, content: PENDING_PAYMENT },
            { column: TRANSACTION_LIST_COLUMNS.SOURCE, content: TRANSACTION_SOURCE_TYPES.INVOICE },
          ],
          [
            { column: TRANSACTION_LIST_COLUMNS.TYPE, content: ENCUMBRANCE },
            { column: TRANSACTION_LIST_COLUMNS.SOURCE, content: TRANSACTION_SOURCE_TYPES.PO_LINE },
          ],
        ];

        const invoiceSourceTransactions = expenseClassFilteredTransactions.slice(0, 3);

        const poLineSourceTransactions = [
          [
            { column: TRANSACTION_LIST_COLUMNS.TYPE, content: ENCUMBRANCE },
            { column: TRANSACTION_LIST_COLUMNS.SOURCE, content: TRANSACTION_SOURCE_TYPES.PO_LINE },
          ],
          [
            { column: TRANSACTION_LIST_COLUMNS.TYPE, content: ENCUMBRANCE },
            { column: TRANSACTION_LIST_COLUMNS.SOURCE, content: TRANSACTION_SOURCE_TYPES.PO_LINE },
          ],
        ];

        const waitForTransactions = () => FinanceHelper.waitForTransactionsRequestCompletion();

        const applyAndWait = (action) => {
          action();
          waitForTransactions();
        };

        const setTransactionTypeFilter = ({
          resetAll = false,
          clearType = false,
          unselectType = null,
          selectType,
        }) => {
          if (resetAll) {
            applyAndWait(() => Transactions.clickResetAllButton());
          } else if (clearType) {
            applyAndWait(() => Transactions.clearFilter(TRANSACTION_RESULTS_FILTERS.TYPE));
          } else if (unselectType) {
            applyAndWait(() => Transactions.selectTransactionTypeFilter(unselectType));
          }

          Transactions.selectTransactionTypeFilter(selectType);
          waitForTransactions();
        };

        const verifySourcesInTransactionDetails = (sources = []) => {
          cy.wrap(sources).each((source, index) => {
            Transactions.clickNthLinkInTransactionsResults(index);
            TransactionDetails.checkTransactionDetails({
              information: [{ key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: source }],
            });
            TransactionDetails.closeTransactionDetails();
          });
        };

        const verifyRowsAndSources = (rowsConfig = [], sources = []) => {
          Transactions.assertRowCellsContent(rowsConfig);
          verifySourcesInTransactionDetails(sources);
        };

        /* STEP 1: Click "Actions" and open transactions for current budget */
        // Expected: Transactions pane appears with transactions from Preconditions in descending order.
        Funds.viewTransactionsForCurrentBudget();
        FinanceHelper.interceptTransactionsRequest();
        Transactions.waitLoading();
        Transactions.checkTransactionDatesSorted(SORT_DIRECTIONS.DESCENDING);
        Transactions.assertRowCellsContent(allTransactionsInList);

        /* STEP 2: Click transaction date column title */
        // Expected: Transaction list is sorted by date in ascending order.
        cy.do(MultiColumnListHeader(TRANSACTION_LIST_COLUMNS.TRANSACTION_DATE).click());
        Transactions.checkTransactionDatesSorted(SORT_DIRECTIONS.ASCENDING);

        Object.values(TRANSACTION_RESULTS_FILTERS).forEach((filter) => Transactions.toggleFilterAccordion(filter));

        /* STEP 3: Filter transactions by Source POL number */
        Transactions.filterByPOLineNumber(orderLine1.poLineNumber);
        waitForTransactions();

        /* STEP 4: Verify transaction details */
        // Expected: Only transactions related to the POL are displayed in the list. Details contain POL number in the source field.
        Transactions.assertResultsTransactionsByType([ENCUMBRANCE]);
        Transactions.selectTransaction(ENCUMBRANCE);
        TransactionDetails.checkTransactionDetails({
          information: [{ key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: orderLine1.poLineNumber }],
        });
        TransactionDetails.closeTransactionDetails();

        /* STEP 5: Filter transactions by Source Invoice number */
        applyAndWait(() => Transactions.clickResetAllButton());
        Transactions.filterByInvoiceNumber(invoice1.vendorInvoiceNo);
        waitForTransactions();

        /* STEP 6: Verify transaction details */
        // Expected: Only transactions related to the Invoice are displayed in the list. Details contain Invoice number in the source field.
        Transactions.assertResultsTransactionsByType([PENDING_PAYMENT]);
        Transactions.selectTransaction(PENDING_PAYMENT);
        TransactionDetails.checkTransactionDetails({
          information: [{ key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: invoice1.vendorInvoiceNo }],
        });
        TransactionDetails.closeTransactionDetails();

        /* STEPS 7-12: Filter by transaction type */
        // Expected:
        // 7 -> Allocation only
        // 8 -> Credit only
        // 9 -> Encumbrance only
        // 10 -> Payment only
        // 11 -> Pending payment only
        // 12 -> Transfer only
        [
          { resetAll: true, selectType: ALLOCATION, expectedTypes: [ALLOCATION] },
          { unselectType: ALLOCATION, selectType: CREDIT, expectedTypes: [CREDIT] },
          { unselectType: CREDIT, selectType: ENCUMBRANCE, expectedTypes: [ENCUMBRANCE] },
          { unselectType: ENCUMBRANCE, selectType: PAYMENT, expectedTypes: [PAYMENT] },
          { unselectType: PAYMENT, selectType: PENDING_PAYMENT, expectedTypes: [PENDING_PAYMENT] },
          { clearType: true, selectType: TRANSFER, expectedTypes: [TRANSFER] },
        ].forEach(({ expectedTypes, ...typeFilterConfig }) => {
          setTransactionTypeFilter(typeFilterConfig);
          Transactions.assertResultsTransactionsByType(expectedTypes);
        });

        /* STEP 13: Filter transactions by tag */
        // Expected: No transactions are displayed in the list.
        Transactions.filterByTags([tags[0]]);
        waitForTransactions();
        Transactions.assertNoResultsMessage();

        /* STEP 14: Filter transactions by type "Allocation" with active tags filter */
        // Expected: Only transactions of "Allocation" type with the tag are displayed in the list.
        setTransactionTypeFilter({ unselectType: TRANSFER, selectType: ALLOCATION });
        Transactions.assertResultsTransactionsByType([ALLOCATION]);

        /* STEP 15: Filter by additional tag */
        // Expected: Only transactions of "Allocation" type with the second tag are displayed in the list.
        Transactions.filterByTags([tags[1]]);
        waitForTransactions();
        Transactions.assertResultsTransactionsByType([ALLOCATION]);

        /* STEP 16: Filter by expense class */
        // Expected: Only transactions related to the expense class are displayed in the list.
        applyAndWait(() => Transactions.clearFilter(TRANSACTION_RESULTS_FILTERS.TAGS));
        applyAndWait(() => Transactions.clickResetAllButton());
        Transactions.filterByExpenseClass(expenseClassA.name);
        waitForTransactions();
        // Verify both list rows and detail sources for filtered results.
        verifyRowsAndSources(expenseClassFilteredTransactions, [
          invoice3.vendorInvoiceNo,
          invoice2.vendorInvoiceNo,
          invoice1.vendorInvoiceNo,
          orderLine1.poLineNumber,
        ]);

        /* STEP 17: Filter additionally by Invoice Number */
        // Expected: Only transactions related to the expense class and the invoice are displayed in the list.
        Transactions.filterBySource(TRANSACTION_SOURCE_TYPES.INVOICE);
        waitForTransactions();
        verifyRowsAndSources(invoiceSourceTransactions, [
          invoice3.vendorInvoiceNo,
          invoice2.vendorInvoiceNo,
          invoice1.vendorInvoiceNo,
        ]);

        /* STEP 18: Filter transactions by PO Line source */
        // Expected: Only transactions related to the PO Line are displayed in the list.
        applyAndWait(() => Transactions.filterBySource(TRANSACTION_SOURCE_TYPES.INVOICE));
        Transactions.filterBySource(TRANSACTION_SOURCE_TYPES.PO_LINE);
        waitForTransactions();
        applyAndWait(() => Transactions.clearFilter(TRANSACTION_RESULTS_FILTERS.EXPENSE_CLASS));
        verifyRowsAndSources(poLineSourceTransactions, [
          orderLine2.poLineNumber,
          orderLine1.poLineNumber,
        ]);

        /* STEP 19: Filter transactions by User source */
        // Expected: Only transactions related to the User and PO Line sources are displayed in the list.
        Transactions.filterBySource(TRANSACTION_SOURCE_TYPES.USER);
        waitForTransactions();
        Transactions.assertResultsTransactionsByType([ENCUMBRANCE, TRANSFER, ALLOCATION]);

        /* STEP 20: Filter transactions by Allocation source */
        Transactions.filterByEncumbranceStatus(ENCUMBRANCE_STATUSES.UNRELEASED);
        waitForTransactions();
        Transactions.selectTransaction(ENCUMBRANCE);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: orderLine2.poLineNumber },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
          ],
        });
        TransactionDetails.closeTransactionDetails();

        /* STEP 21: Filter transactions by Released encumbrance status */
        Transactions.filterByEncumbranceStatus(ENCUMBRANCE_STATUSES.RELEASED);
        waitForTransactions();
        verifyRowsAndSources(poLineSourceTransactions, [
          orderLine2.poLineNumber,
          orderLine1.poLineNumber,
        ]);

        /* STEP 22: Reset all filters */
        Transactions.clickResetAllButton();
        waitForTransactions();
        Transactions.assertRowCellsContent(allTransactionsInList);
      },
    );
  });
});

function getPreconditionSteps() {
  const createOrderStep = (flow, orderKey, orderType) => {
    return Orders.createOrderViaApi({
      id: uuid(),
      vendor: flow.get(R.ORG).id,
      orderType,
      approved: true,
      reEncumber: true,
      ...(orderType === ORDER_TYPES.ONGOING && {
        ongoing: {
          isSubscription: false,
          manualRenewal: false,
        },
      }),
    }).then((entity) => flow.set(orderKey, entity));
  };

  const createOrderLineStep = (flow, { orderKey, orderLineKey, amount, expenseClassKey }) => {
    return OrderLines.createOrderLineViaApi({
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId: flow.get(orderKey).id,
      acquisitionMethod: flow.get(R.ACQUISITION_METHOD).id,
      fundDistribution: [
        {
          code: flow.get(R.FUND_A).code,
          fundId: flow.get(R.FUND_A).id,
          expenseClassId: flow.get(expenseClassKey).id,
          value: 100,
        },
      ],
      locations: [{ locationId: flow.get(R.LOCATION).id, quantity: 1, quantityPhysical: 1 }],
      cost: {
        listUnitPrice: amount,
        currency: flow.get(R.LOCALE).currency,
        discountType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
        quantityPhysical: 1,
        poLineEstimatedPrice: amount,
      },
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
        materialType: flow.get(R.MATERIAL_TYPE).id,
        materialSupplier: flow.get(R.ORG).id,
        volumes: [],
      },
    }).then((entity) => flow.set(orderLineKey, entity));
  };

  const openOrderStep = (flow, orderKey) => {
    return Orders.updateOrderViaApi({
      ...flow.get(orderKey),
      workflowStatus: ORDER_STATUSES.OPEN,
    });
  };

  const createInvoiceStep = (flow, { invoiceKey, poLineKey, releaseEncumbrance, subTotal }) => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: flow.get(R.ORG).id,
      fiscalYearId: flow.get(R.FISCAL_YEAR).id,
      accountingCode: flow.get(R.ORG).erpCode,
      poLineId: flow.get(poLineKey).id,
      fundDistributions: flow.get(poLineKey).fundDistribution,
      releaseEncumbrance,
      subTotal,
      currency: flow.get(R.LOCALE).currency,
    }).then((entity) => flow.set(invoiceKey, entity));
  };

  const updateInvoiceStatusStep = (flow, invoiceKey, status) => {
    return Invoices.changeInvoiceStatusViaApi({
      invoice: flow.get(invoiceKey),
      status,
    });
  };

  const createFiscalYear = (flow) => {
    return FiscalYears.createViaApi(FiscalYears.getDefaultFiscalYear()).then((entity) => flow.set(R.FISCAL_YEAR, entity));
  };

  const createLedger = (flow) => {
    return Ledgers.createViaApi({
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: flow.get(R.FISCAL_YEAR).id,
    }).then((entity) => flow.set(R.LEDGER, entity));
  };

  const createFundsAndBudgets = (flow) => {
    const createFundStep = (key, nameSuffix) => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        ledgerId: flow.get(R.LEDGER).id,
        name: `autotest_${nameSuffix}_${Date.now()}`,
      }).then((entity) => flow.set(key, entity.fund));
    };

    const createBudgetStep = (budgetKey, fundKey, { statusExpenseClasses } = {}) => {
      return Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        allocated: 500,
        fundId: flow.get(fundKey).id,
        fiscalYearId: flow.get(R.FISCAL_YEAR).id,
        statusExpenseClasses,
      }).then((entity) => flow.set(budgetKey, entity));
    };

    const statusExpenseClasses = [
      { expenseClassId: flow.get(R.EXPENSE_CLASS_A).id, status: EXPENSE_CLASS_STATUSES.ACTIVE },
      { expenseClassId: flow.get(R.EXPENSE_CLASS_B).id, status: EXPENSE_CLASS_STATUSES.ACTIVE },
    ];

    return createFundStep(R.FUND_A, 'fundA')
      .then(() => createFundStep(R.FUND_B, 'fundB'))
      .then(() => createBudgetStep(R.BUDGET_A, R.FUND_A, { statusExpenseClasses }))
      .then(() => createBudgetStep(R.BUDGET_B, R.FUND_B));
  };

  const createExpenseClassesForBudgetA = (flow) => {
    [R.EXPENSE_CLASS_A, R.EXPENSE_CLASS_B].forEach((key) => {
      ExpenseClasses.createExpenseClassViaApi(ExpenseClasses.getDefaultExpenseClass()).then(
        (entity) => flow.set(key, entity),
      );
    });
  };

  const createTransfers = (flow) => {
    const fundAId = flow.get(R.FUND_A).id;
    const fundBId = flow.get(R.FUND_B).id;
    const fiscalYearId = flow.get(R.FISCAL_YEAR).id;

    return Transfers.createTransferViaApi(
      Transfers.getDefaultTransfer({
        amount: 25,
        fromFundId: fundAId,
        toFundId: fundBId,
        fiscalYearId,
      }),
    ).then(() => Transfers.createTransferViaApi(
      Transfers.getDefaultTransfer({
        amount: 5,
        fromFundId: fundBId,
        toFundId: fundAId,
        fiscalYearId,
      }),
    ));
  };

  const createOrganization = (flow) => {
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      name: `autotest_org_${Date.now()}`,
    };

    return Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      flow.set(R.ORG, { ...organization, id: organizationId }, (entity) => Organizations.deleteOrganizationViaApi(entity.id));
    });
  };

  const fetchLocation = (flow) => {
    return cy.getLocations({ limit: 1 }).then((location) => flow.set(R.LOCATION, location));
  };

  const fetchMaterialType = (flow) => {
    return cy
      .getDefaultMaterialType()
      .then((materialType) => flow.set(R.MATERIAL_TYPE, materialType));
  };

  const fetchAcquisitionMethod = (flow) => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => flow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
  };

  const createOrder1WithLineAndOpen = (flow) => {
    return createOrderStep(flow, R.ORDER_1, ORDER_TYPES.ONE_TIME_API)
      .then(() => createOrderLineStep(flow, {
        orderKey: R.ORDER_1,
        orderLineKey: R.ORDER_LINE_1,
        amount: 70,
        expenseClassKey: R.EXPENSE_CLASS_A,
      }))
      .then(() => openOrderStep(flow, R.ORDER_1));
  };

  const createOrder2WithLineAndOpen = (flow) => {
    return createOrderStep(flow, R.ORDER_2, ORDER_TYPES.ONGOING)
      .then(() => createOrderLineStep(flow, {
        orderKey: R.ORDER_2,
        orderLineKey: R.ORDER_LINE_2,
        amount: 90,
        expenseClassKey: R.EXPENSE_CLASS_B,
      }))
      .then(() => openOrderStep(flow, R.ORDER_2));
  };

  const createInvoice1AndApprove = (flow) => {
    return createInvoiceStep(flow, {
      invoiceKey: R.INVOICE_1,
      poLineKey: R.ORDER_LINE_1,
      releaseEncumbrance: true,
      subTotal: 15,
    }).then(() => updateInvoiceStatusStep(flow, R.INVOICE_1, INVOICE_STATUSES.APPROVED));
  };

  const createInvoice2AndPay = (flow) => {
    return createInvoiceStep(flow, {
      invoiceKey: R.INVOICE_2,
      poLineKey: R.ORDER_LINE_1,
      releaseEncumbrance: true,
      subTotal: 20,
    }).then(() => updateInvoiceStatusStep(flow, R.INVOICE_2, INVOICE_STATUSES.PAID));
  };

  const createInvoice3AndPay = (flow) => {
    return createInvoiceStep(flow, {
      invoiceKey: R.INVOICE_3,
      poLineKey: R.ORDER_LINE_1,
      releaseEncumbrance: true,
      subTotal: -5,
    }).then(() => updateInvoiceStatusStep(flow, R.INVOICE_3, INVOICE_STATUSES.PAID));
  };

  const createInvoice4AndApprove = (flow) => {
    return createInvoiceStep(flow, {
      invoiceKey: R.INVOICE_4,
      poLineKey: R.ORDER_LINE_2,
      releaseEncumbrance: false,
      subTotal: 12,
    }).then(() => updateInvoiceStatusStep(flow, R.INVOICE_4, INVOICE_STATUSES.APPROVED));
  };

  const createTaggedAllocationTransactions = (flow) => {
    const fundId = flow.get(R.FUND_A).id;
    const fiscalYearId = flow.get(R.FISCAL_YEAR).id;
    const currency = flow.get(R.LOCALE).currency;

    const tags = ['tag1', 'tag2', 'tag3', 'tag4'].map(
      (tag) => `auto-test_tag_${tag}_${Date.now()}`,
    );
    const tagsIds = [];

    tags.forEach((tag) => {
      cy.createTagApi({ label: tag }).then((tagId) => {
        tagsIds.push(tagId);
      });
    });

    flow.set(R.TAGS, tags, () => tagsIds.forEach((id) => cy.deleteTagApi(id)));

    return Transactions.createBatchAllocationsViaApi([
      {
        amount: 10,
        currency,
        fiscalYearId,
        toFundId: fundId, // Increase allocation to Fund A
        tags: { tagList: [tags[0], tags[1]] },
      },
      {
        amount: 5,
        currency,
        fiscalYearId,
        fromFundId: fundId, // Decrease allocation from Fund A
        tags: { tagList: [tags[2], tags[3]] },
      },
    ]);
  };

  const createAuthorizedUser = (flow) => {
    return cy
      .createTempUser([permissions.uiFinanceViewFundAndBudget.gui])
      .then((user) => flow.set(R.USER, user, () => Users.deleteViaApi(user.userId)));
  };

  const loginAsAuthorizedUser = (flow) => {
    const user = flow.get(R.USER);

    return cy.login(user.username, user.password, {
      path: TopMenu.fundPath,
      waiter: Funds.waitLoading,
    });
  };

  const openFundADetailsForAuthorizedUser = (flow) => {
    FinanceHelper.searchByName(flow.get(R.FUND_A).name);
    Funds.selectFund(flow.get(R.FUND_A).name);
  };

  return {
    createFiscalYear,
    createLedger,
    createFundsAndBudgets,
    createExpenseClassesForBudgetA,
    createTransfers,
    createOrganization,
    fetchLocation,
    fetchMaterialType,
    fetchAcquisitionMethod,
    createOrder1WithLineAndOpen,
    createOrder2WithLineAndOpen,
    createInvoice1AndApprove,
    createInvoice2AndPay,
    createInvoice3AndPay,
    createInvoice4AndApprove,
    createTaggedAllocationTransactions,
    createAuthorizedUser,
    loginAsAuthorizedUser,
    openFundADetailsForAuthorizedUser,
  };
}
