import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  ORDER_TYPES,
} from '../../support/constants';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import { BUDGET_STATUSES } from '../../support/constants/finance/budget';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import { FUND_STATUSES } from '../../support/constants/finance/fund';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import { LEDGER_STATUSES } from '../../support/constants/finance/ledger';
import DuplicateInvoiceModal from '../../support/fragments/invoices/modal/duplicateInvoiceModal';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Permissions from '../../support/dictionary/permissions';
import DateTools from '../../support/utils/dateTools';
import getRandomStringCode from '../../support/utils/generateTextCode';
import getRandomPostfix from '../../support/utils/stringTools';
import { ExecutionFlowManager, PaneRequestWaiter } from '../../support/utils';

const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

const R = {
  LOCALE: 'locale',
  FISCAL_YEAR: 'fiscalYear',
  LEDGER: 'ledger',
  FUND: 'fund',
  BUDGET: 'budget',
  ORGANIZATION: 'organization',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  INVOICE: 'invoice',
  DUPLICATED_INVOICE: 'duplicatedInvoice',
  USER: 'user',
};

const TEST_VALUES = {
  BUDGET_ALLOCATION: 1000,
  INVOICE_SUBTOTAL: 100,
  FUND_DISTRIBUTION: 100,
  CANCELLATION_NOTE: `AT_C1332438_CancellationNote_${getRandomPostfix()}`,
};

describe('Invoices', () => {
  const flow = new ExecutionFlowManager();
  const postfix = getRandomPostfix();
  const fiscalYearSeries = getRandomStringCode(5);

  const waitForFilters = (trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
    phase: PANE_REQUEST_PHASES.FILTERS,
    trigger,
  });

  const waitForResults = (trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
    trigger,
  });

  before('Create C1332438 preconditions', () => {
    cy.getAdminToken();

    flow
      .step(() => {
        return cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));
      })
      // Precondition 1: Active Fund A with a current budget having $1000 allocation exists.
      .step((f) => {
        return FiscalYears.createViaApi({
          ...FiscalYears.getDefaultFiscalYear(),
          ...DateTools.getFullFiscalYearStartAndEnd(0),
          code: `${fiscalYearSeries}${new Date().getFullYear()}`,
          currency: f.get(R.LOCALE).currency,
          series: fiscalYearSeries,
        }).then((fiscalYear) => f.set(R.FISCAL_YEAR, fiscalYear, () => FiscalYears.deleteFiscalYearViaApi(fiscalYear.id, false)));
      })
      // Precondition 1: The ledger provides the current fiscal-year context for Fund A.
      .step((f) => {
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: f.get(R.FISCAL_YEAR).id,
          ledgerStatus: LEDGER_STATUSES.ACTIVE,
        }).then((ledger) => f.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id, false)));
      })
      // Precondition 1: Fund A is active and linked to the current ledger.
      .step((f) => {
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: f.get(R.LEDGER).id,
          name: `AT_C1332438_Fund_${postfix}`,
          code: `AT_C1332438_${postfix}`,
          fundStatus: FUND_STATUSES.ACTIVE,
        }).then(({ fund }) => f.set(R.FUND, fund, () => Funds.deleteFundViaApi(fund.id, false)));
      })
      // Precondition 1: Fund A has a current active budget with the required allocation.
      .step((f) => {
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: f.get(R.FISCAL_YEAR).id,
          fundId: f.get(R.FUND).id,
          allocated: TEST_VALUES.BUDGET_ALLOCATION,
          budgetStatus: BUDGET_STATUSES.ACTIVE,
        }).then((budget) => f.set(R.BUDGET, budget, () => Budgets.deleteViaApi(budget.id, false)));
      })
      // Precondition 2: An invoice in Open status has an invoice-line Fund A distribution.
      .step((f) => {
        return NewOrganization.createViaApi({
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_C1332438_Vendor_${postfix}`,
          code: `AT_C1332438_${postfix}`,
        }).then((organization) => f.set(R.ORGANIZATION, organization, () => Organizations.deleteOrganizationViaApi(organization.id)));
      })
      // Precondition 2: The invoice is associated with a purchase order from the vendor.
      .step((f) => {
        return Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({
            vendorId: f.get(R.ORGANIZATION).id,
            orderType: ORDER_TYPES.ONE_TIME_API,
          }),
        ).then((order) => f.set(R.ORDER, order, () => Orders.deleteOrderViaApi(order.id, false)));
      })
      // Precondition 2: The invoice line uses Fund A for its fund distribution.
      .step((f) => {
        return cy
          .getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          })
          .then(({ body }) => {
            const orderLine = BasicOrderLine.getDefaultOrderLine({
              acquisitionMethod: body.acquisitionMethods[0].id,
              fundDistribution: [
                {
                  code: f.get(R.FUND).code,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  fundId: f.get(R.FUND).id,
                  value: TEST_VALUES.FUND_DISTRIBUTION,
                },
              ],
              listUnitPrice: TEST_VALUES.INVOICE_SUBTOTAL,
              poLineEstimatedPrice: TEST_VALUES.INVOICE_SUBTOTAL,
              purchaseOrderId: f.get(R.ORDER).id,
            });

            return OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => f.set(R.ORDER_LINE, createdOrderLine, () => OrderLines.deleteOrderLineViaApi(createdOrderLine.id, false)));
          });
      })
      // Precondition 2: The purchase order is opened so the invoice line can be used by the invoice.
      .step((f) => {
        return Orders.updateOrderViaApi({
          ...f.get(R.ORDER),
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      // Precondition 2: The open invoice and its invoice line are created for the vendor and Fund A.
      .step((f) => {
        return cy
          .getBatchGroups()
          .then((batchGroup) => Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: f.get(R.ORGANIZATION).id,
            poLineId: f.get(R.ORDER_LINE).id,
            fiscalYearId: f.get(R.FISCAL_YEAR).id,
            batchGroupId: batchGroup.id,
            fundDistributions: f.get(R.ORDER_LINE).fundDistribution,
            accountingCode: f.get(R.ORGANIZATION).erpCode,
            subTotal: TEST_VALUES.INVOICE_SUBTOTAL,
            invoiceStatus: INVOICE_STATUSES.OPEN,
          }))
          .then((invoice) => f.set(R.INVOICE, invoice, () => Invoices.deleteInvoiceViaApi(invoice.id)));
      })
      // Precondition 3: The invoice is approved, then cancelled with a populated cancellation note.
      .step((f) => {
        return Invoices.updateInvoiceViaApi({
          ...f.get(R.INVOICE),
          status: INVOICE_STATUSES.APPROVED,
        })
          .then(() => {
            return Invoices.getInvoiceByIdViaApi(f.get(R.INVOICE).id).then((approvedInvoice) => {
              return Invoices.updateInvoiceViaApi({
                ...approvedInvoice,
                cancellationNote: TEST_VALUES.CANCELLATION_NOTE,
                status: INVOICE_STATUSES.CANCELLED,
              });
            });
          })
          .then(() => Invoices.getInvoiceByIdViaApi(f.get(R.INVOICE).id).then((cancelledInvoice) => f.set(R.INVOICE, cancelledInvoice)));
      })
      // Precondition 4: The authorized user has only the Invoice: Can view, edit and create capability set.
      .step((f) => {
        return cy
          .createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui])
          .then((user) => f.set(R.USER, user, () => Users.deleteViaApi(user.userId)));
      })
      // Precondition 5: The user is in Invoices with the precondition invoice in the search results.
      .step((f) => {
        return waitForFilters(() => cy.login(f.get(R.USER).username, f.get(R.USER).password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        })).then(() => waitForResults(() => Invoices.searchByNumber(f.get(R.INVOICE).vendorInvoiceNo)));
      });
  });

  after('Delete C1332438 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C1332438 Duplicate cancelled invoice without cancellation note',
    { tags: ['extendedPath', 'thunderjet', 'C1332438'] },
    () => {
      const { invoice } = flow.ctx();

      cy.log('Step 1. Open the cancelled invoice and verify its cancellation note');
      Invoices.selectInvoice(invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.CANCELLED },
          { key: INVOICE_VIEW_FIELDS.CANCELLATION_NOTE, value: TEST_VALUES.CANCELLATION_NOTE },
        ],
      });

      cy.log('Step 2. Duplicate the invoice and verify cancellationNote is omitted');
      cy.intercept('POST', '/invoice/invoices*').as('duplicateInvoice');
      Invoices.selectDuplicateInvoice();
      DuplicateInvoiceModal.clickDuplicateButton();
      cy.wait('@duplicateInvoice').then(({ request, response }) => {
        expect(request.body).not.to.have.property('cancellationNote');
        expect(response.body).not.to.have.property('cancellationNote');

        flow.set(R.DUPLICATED_INVOICE, response.body, () => Invoices.deleteInvoiceViaApi(response.body.id));
      });

      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
        ],
        fieldsNotDisplayed: [INVOICE_VIEW_FIELDS.CANCELLATION_NOTE],
      });
    },
  );
});
