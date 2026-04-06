/* eslint-disable no-use-before-define */

import permissions from '../../../support/dictionary/permissions';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, INVOICE_STATUSES, ORDER_STATUSES } from '../../../support/constants';
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
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';

const EXPECTED_CONTEXT_FIELDS = {
  currentFiscalYear: 'currentFiscalYear',
  nextFiscalYear: 'nextFiscalYear',
  ledgerA: 'ledgerA',
  ledgerB: 'ledgerB',
  groupA: 'groupA',
  groupB: 'groupB',
  fundA: 'fundA',
  fundB: 'fundB',
  order: 'order',
  orderLine: 'orderLine',
  invoice: 'invoice',
  vendor: 'vendor',
  user: 'user',
};

describe('Finance | Fiscal Year', () => {
  before('Create fiscal years, ledgers, groups, funds, order, invoice and rollover', () => {
    cy.getAdminToken();

    createActiveConsecutiveFiscalYears(); // Precondition #1
    createActiveLedgersForCurrentFiscalYear(); // Precondition #2
    createActiveGroups(); // Precondition #3
    createActiveFundsForWithGroups(); // Precondition #4-5
    createPurchaseOrderWithLine(); // Precondition #6
    createTestUserAndLogin(); // Precondition #12-13
  });

  after('Delete test data', () => {
    cleanupTestData();
  });

  it(
    'C1030041 Verify that correct data is displayed for two consecutive fiscal years (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1030041'] },
    () => {
      console.log('it', ctx);
    },
  );
});

// --- API calls and support functions ---

class TestDataContext {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        return target[prop];
      },
      set(target, prop, value) {
        console.group(`Setting context field: ${prop}`);
        console.log(value);
        console.groupEnd();

        target[prop] = value;
        return true;
      }
    });
  }

  getByAlias = (key) => {
    return cy.get(`@${key}`);
  }

  setByAlias = (key) => {
    return (value) => {
      this[key] = value;
      cy.wrap(value).as(key);
    };
  }
}


const ctx = new TestDataContext();

function createActiveConsecutiveFiscalYears() {
  // Fiscal year #1
  FiscalYears
    .createViaApi({
      ...FiscalYears.getDefaultFiscalYear(),
      ...DateTools.getFullFiscalYearStartAndEnd(),
    })
    .then(ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.currentFiscalYear));

  // Fiscal year #2 - consecutive to the first one
  FiscalYears
    .createViaApi({
      ...FiscalYears.getDefaultFiscalYear(),
      ...DateTools.getFullFiscalYearStartAndEnd(1),
    })
    .then(ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.nextFiscalYear));
}

function createActiveLedgersForCurrentFiscalYear() {
  ctx.getByAlias(EXPECTED_CONTEXT_FIELDS.currentFiscalYear).then((currentFiscalYear) => {
    const fiscalYearOneId = currentFiscalYear.id;
    Ledgers
      .createViaApi({ ...Ledgers.getDefaultLedger(), fiscalYearOneId })
      .then(ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.ledgerA));
    Ledgers
      .createViaApi({ ...Ledgers.getDefaultLedger(), fiscalYearOneId })
      .then(ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.ledgerB));
  });
}

function createActiveGroups() {
  Groups.createViaApi(Groups.getDefaultGroup()).then(ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.groupA));
  Groups.createViaApi(Groups.getDefaultGroup()).then(ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.groupB));
}

function createActiveFundsForWithGroups() {
  ctx.getByAlias(EXPECTED_CONTEXT_FIELDS.ledgerA).then((ledgerA) => {
    let fund;

    ctx.getByAlias(EXPECTED_CONTEXT_FIELDS.groupA).then((groupA) => {
      Funds
        .createViaApi(
          { ...Funds.getDefaultFund(), ledgerId: ledgerA.id },
          [groupA.id],
        )
        .then((fundData) => {
          console.log('fund for ledgerA', fundData);
          ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.fundA)(fundData);
          fund = fundData;
        });

      console.log('fund for budget', fund);

      Budgets
        .createViaApi({
          ...Budgets.getDefaultBudget(),
          fundId: fund?.fund?.id,
          fiscalYearId: ledgerA.fiscalYearOneId,
          allocated: 1000,
        })
        .then(ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.budgetA));
    });
  });

  ctx.getByAlias(EXPECTED_CONTEXT_FIELDS.ledgerB).then((ledgerB) => {
    ctx.getByAlias(EXPECTED_CONTEXT_FIELDS.groupB).then((groupB) => {
      let fund;

      Funds
        .createViaApi(
          { ...Funds.getDefaultFund(), ledgerId: ledgerB.id },
          [groupB.id],
        )
        .then((fundData) => {
          ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.fundB)(fundData);
          fund = fundData;
        });

      Budgets
        .createViaApi({
          ...Budgets.getDefaultBudget(),
          fundId: fund?.fund?.id,
          fiscalYearId: ledgerB.fiscalYearOneId,
          allocated: 1000,
        })
        .then(ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.budgetB));
    });
  });
}

function createPurchaseOrderWithLine() {
  let order;
  let vendor;
  const fundDistribution = [];

  NewOrganization
    .createViaApi(NewOrganization.getDefaultOrganization())
    .then((organization) => {
      vendor = organization;
      ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.vendor)(organization);
    });

  Orders
    .createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: vendor?.id }),
      reEncumber: true,
    })
    .then((orderData) => {
      order = orderData;
    });

  [EXPECTED_CONTEXT_FIELDS.fundA, EXPECTED_CONTEXT_FIELDS.fundB].forEach((fundKey) => {
    ctx.getByAlias(fundKey).then((fund) => {
      fundDistribution.push({
        fundId: fund.fund.id,
        distributionType: 'percentage',
        value: 50,
      });
    });
  });

  OrderLines
    .createOrderLineViaApi(BasicOrderLine.getDefaultOrderLine({
      purchaseOrderId: order?.id,
      listUnitPrice: 25,
      fundDistribution,
    }))
    .then(ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.orderLine));

  Orders
    .updateOrderViaApi({ ...order, status: ORDER_STATUSES.OPEN })
    .then(({ body }) => {
      console.log('Updated order', body);
      ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.order)(body);
    });
}

function createTestUserAndLogin() {
  cy.createTempUser([permissions.uiFinanceViewFiscalYear.internal])
    .then((userProperties) => {
      ctx.setByAlias(EXPECTED_CONTEXT_FIELDS.user)(userProperties);

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitForLedgerDetailsLoading,
      });
    });
}

function cleanupTestData() {
  cy.getAdminToken();

  if (ctx.orderLine?.id) {
    OrderLines.deleteOrderLineViaApi(ctx.orderLine.id);
  }

  if (ctx.order?.id) {
    Orders.deleteOrderViaApi(ctx.order.id);
  }

  if (ctx.vendor?.id) {
    Organizations.deleteOrganizationViaApi(ctx.vendor.id);
  }

  if (ctx.invoice?.id) {
    Invoices.deleteInvoiceViaApi(ctx.invoice.id);
  }

  const budgetIds = [ctx.budgetA?.id, ctx.budgetB?.id].filter(Boolean);
  budgetIds.forEach((id) => Budgets.deleteViaApi(id));

  const fundIds = [ctx.fundA?.fund?.id, ctx.fundB?.fund?.id].filter(Boolean);
  fundIds.forEach((id) => Funds.deleteFundViaApi(id));

  const groupIds = [ctx.groupA?.id, ctx.groupB?.id].filter(Boolean);
  groupIds.forEach((id) => Groups.deleteGroupViaApi(id));

  const ledgerIds = [ctx.ledgerA?.id, ctx.ledgerB?.id].filter(Boolean);
  ledgerIds.forEach((id) => Ledgers.deleteLedgerViaApi(id));

  const fiscalYearIds = [ctx.currentFiscalYear?.id, ctx.nextFiscalYear?.id].filter(Boolean);
  fiscalYearIds.forEach((id) => FiscalYears.deleteFiscalYearViaApi(id));

  if (ctx.user?.userId) {
    Users.deleteViaApi(ctx.user.userId);
  }
}
