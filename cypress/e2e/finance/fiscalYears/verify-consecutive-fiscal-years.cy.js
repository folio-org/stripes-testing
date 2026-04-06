/* eslint-disable no-use-before-define */

import permissions from '../../../support/dictionary/permissions';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, FUND_DISTRIBUTION_TYPES, INVOICE_STATUSES, ORDER_STATUSES } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import FiscalYearDetails from '../../../support/fragments/finance/fiscalYears/fiscalYearDetails';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Groups from '../../../support/fragments/finance/groups/groups';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import Orders from '../../../support/fragments/orders/orders';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import { ResourceFlowManager } from '../../../support/utils';

const EXPECTED_CONTEXT_FIELDS = {
  currentFiscalYear: 'currentFiscalYear',
  nextFiscalYear: 'nextFiscalYear',
  ledgerA: 'ledgerA',
  ledgerB: 'ledgerB',
  groupA: 'groupA',
  groupB: 'groupB',
  fundA: 'fundA',
  fundB: 'fundB',
  budgetA: 'budgetA',
  budgetB: 'budgetB',
  order: 'order',
  orderLine: 'orderLine',
  invoice: 'invoice',
  vendor: 'vendor',
  user: 'user',
};

const resourceFlow = new ResourceFlowManager();

describe('Finance | Fiscal Year', () => {
  before('Create fiscal years, ledgers, groups, funds, order, invoice and rollover', () => {
    cy.getAdminToken();

    resourceFlow
      .step(createActiveConsecutiveFiscalYears) // Precondition #1
      .step(createActiveLedgersForCurrentFiscalYear) // Precondition #2
      .step(createActiveGroups) // Precondition #3
      .step(createActiveFundsForWithGroups) // Precondition #4-5
      .step(createPurchaseOrderWithLine) // Precondition #6
      .step(createPaidInvoiceWithInvoiceLines) // Precondition #6
      .step(createTestUserAndLogin); // Precondition #12-13
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    console.log(resourceFlow.context);
    resourceFlow.cleanup();
  });

  it(
    'C1030041 Verify that correct data is displayed for two consecutive fiscal years (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1030041'] },
    () => {
      console.log('it', resourceFlow.context);
    },
  );
});

// --- API calls and support functions ---

function createActiveConsecutiveFiscalYears(flowManager) {
  [
    EXPECTED_CONTEXT_FIELDS.currentFiscalYear,
    EXPECTED_CONTEXT_FIELDS.nextFiscalYear,
  ].forEach((fiscalYearKey, index) => {
    FiscalYears
      .createViaApi({
        ...FiscalYears.getDefaultFiscalYear(),
        ...DateTools.getFullFiscalYearStartAndEnd(index),
      })
      .then((fiscalYear) => flowManager.set(fiscalYearKey, fiscalYear));
  });
}

function createActiveLedgersForCurrentFiscalYear(flowManager) {
  const fiscalYearOneId = flowManager.ctx().get(EXPECTED_CONTEXT_FIELDS.currentFiscalYear).id;

  [
    EXPECTED_CONTEXT_FIELDS.ledgerA,
    EXPECTED_CONTEXT_FIELDS.ledgerB,
  ].forEach((ledgerKey) => {
    Ledgers
      .createViaApi({ ...Ledgers.getDefaultLedger(), fiscalYearOneId })
      .then((ledger) => flowManager.set(ledgerKey, ledger));
  });
}

function createActiveGroups(flowManager) {
  [
    EXPECTED_CONTEXT_FIELDS.groupA,
    EXPECTED_CONTEXT_FIELDS.groupB,
  ].forEach((groupKey) => {
    Groups
      .createViaApi(Groups.getDefaultGroup())
      .then((group) => flowManager.set(groupKey, group));
  });
}

function createActiveFundsForWithGroups(flowManager) {
  const ctx = flowManager.context;
  const fiscalYearOneId = ctx.get(EXPECTED_CONTEXT_FIELDS.currentFiscalYear).id;

  const ledgerAId = ctx.get(EXPECTED_CONTEXT_FIELDS.ledgerA).id;
  const ledgerBId = ctx.get(EXPECTED_CONTEXT_FIELDS.ledgerB).id;

  const groupAId = ctx.get(EXPECTED_CONTEXT_FIELDS.groupA).id;
  const groupBId = ctx.get(EXPECTED_CONTEXT_FIELDS.groupB).id;

  [
    [ledgerAId, groupAId, EXPECTED_CONTEXT_FIELDS.fundA, EXPECTED_CONTEXT_FIELDS.budgetA],
    [ledgerBId, groupBId, EXPECTED_CONTEXT_FIELDS.fundB, EXPECTED_CONTEXT_FIELDS.budgetB],
  ].forEach(([ledgerId, groupId, fundKey, budgetKey]) => {
    Funds
      .createViaApi(
        { ...Funds.getDefaultFund(), ledgerId },
        [groupId],
      )
      .then((fundData) => flowManager.set(fundKey, fundData))
      .then(({ context }) => (
        Budgets
          .createViaApi({
            ...Budgets.getDefaultBudget(),
            fundId: context.get(fundKey).fund.id,
            fiscalYearId: fiscalYearOneId,
            allocated: 1000,
          })
      ))
      .then((budget) => flowManager.set(budgetKey, budget));
  });
}

function createPurchaseOrderWithLine(flowManager) {
  flowManager
    .step(() => {
      NewOrganization
        .createViaApi(NewOrganization.getDefaultOrganization())
        .then((organization) => flowManager.set(
          EXPECTED_CONTEXT_FIELDS.vendor,
          organization,
        ));
    })
    .step((fm) => {
      Orders
        .createOrderViaApi({
          ...NewOrder.getDefaultOrder({ vendorId: fm.context.get(EXPECTED_CONTEXT_FIELDS.vendor)?.id }),
          reEncumber: true,
        })
        .then((order) => fm.set(
          EXPECTED_CONTEXT_FIELDS.order,
          order,
        ));
    })
    .step((fm) => {
      const fundDistribution = [
        EXPECTED_CONTEXT_FIELDS.fundA,
        EXPECTED_CONTEXT_FIELDS.fundB,
      ].map((fundKey) => ({
        fundId: fm.context.get(fundKey).fund.id,
        distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
        value: 50,
      }));

      cy.getAcquisitionMethodsApi({ query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"` })
        .then(({ body }) => (
          OrderLines
            .createOrderLineViaApi(BasicOrderLine.getDefaultOrderLine({
              acquisitionMethod: body.acquisitionMethods[0].id,
              purchaseOrderId: fm.context.get(EXPECTED_CONTEXT_FIELDS.order)?.id,
              listUnitPrice: 25,
              fundDistribution,
            }))
        ))
        .then((orderLine) => fm.set(
          EXPECTED_CONTEXT_FIELDS.orderLine,
          orderLine,
        ));
    })
    .step((fm) => {
      Orders
        .updateOrderViaApi({ ...fm.context.get(EXPECTED_CONTEXT_FIELDS.order), workflowStatus: ORDER_STATUSES.OPEN })
        .then(({ body }) => fm.set(EXPECTED_CONTEXT_FIELDS.order, body));
    });
}

function createPaidInvoiceWithInvoiceLines(flowManager) {
  const ctx = flowManager.context;

  flowManager
    .step(() => {
      Invoices
        .createInvoiceViaApi({
          vendorId: ctx.get(EXPECTED_CONTEXT_FIELDS.vendor)?.id,
          accountingCode: ctx.get(EXPECTED_CONTEXT_FIELDS.vendor)?.erpCode,
          fiscalYearId: ctx.get(EXPECTED_CONTEXT_FIELDS.fiscalYearOne)?.id,
          batchGroupId: ctx.get(EXPECTED_CONTEXT_FIELDS.batchGroup)?.id,
          exportToAccounting: true,
        })
        .then((invoice) => flowManager.set(
          EXPECTED_CONTEXT_FIELDS.invoice,
          invoice,
        ));
    })
    .step((fm) => {
      Invoices
        .createInvoiceLineViaApi(Invoices.getDefaultInvoiceLine({
          invoiceId: fm.context.get(EXPECTED_CONTEXT_FIELDS.invoice)?.id,
          invoiceLineStatus: INVOICE_STATUSES.OPEN,
          poLineId: fm.context.get(EXPECTED_CONTEXT_FIELDS.orderLine)?.id,
          fundDistributions: fm.context.get(EXPECTED_CONTEXT_FIELDS.orderLine)?.fundDistribution,
          subTotal: 20,
          accountingCode: fm.context.get(EXPECTED_CONTEXT_FIELDS.vendor)?.erpCode,
          releaseEncumbrance: false,
        }))
        .then((invoiceLine) => fm.set(
          EXPECTED_CONTEXT_FIELDS.invoiceLine,
          invoiceLine,
        ));
    })
    .step((fm) => {
      Invoices
        .changeInvoiceStatusViaApi({
          invoice: fm.context.get(EXPECTED_CONTEXT_FIELDS.invoice),
          status: INVOICE_STATUSES.PAID,
        })
        .then(({ body }) => {
          console.log('changeInvoiceStatusViaApi', body);
          // fm.set(EXPECTED_CONTEXT_FIELDS.invoice, body)
        });
    });
}


function createTestUserAndLogin(flowManager) {
  cy.createTempUser([permissions.uiFinanceViewFiscalYear.internal])
    .then((userProperties) => {
      flowManager.set(
        EXPECTED_CONTEXT_FIELDS.user,
        userProperties,
        () => Users.deleteViaApi(userProperties.userId),
      );

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitForLedgerDetailsLoading,
      });
    });
}
