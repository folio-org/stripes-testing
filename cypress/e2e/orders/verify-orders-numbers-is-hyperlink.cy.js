import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  Orders,
  OrderDetails,
  OrderLines,
} from '../../support/fragments/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ORDER_STATUSES } from '../../support/constants';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BatchGroups } from '../../support/fragments/settings/invoices';

describe('Orders', () => {
  const ordersCount = 2;
  const testData = {
    batchGroup: BatchGroups.getDefaultBatchGroup(),
    organization: NewOrganization.getDefaultOrganization(),
    orders: [],
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();

      testData.fund = fund;
      testData.budget = budget;
      testData.fiscalYear = fiscalYear;

      BatchGroups.createBatchGroupViaApi(testData.batchGroup);
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        [...Array(ordersCount).keys()].forEach(() => {
          const order = {
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            reEncumber: true,
          };
          const orderLine = BasicOrderLine.getDefaultOrderLine({
            fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
          });

          Orders.createOrderWithOrderLineViaApi(order, orderLine).then((response) => {
            testData.orders.push(response);

            Orders.updateOrderViaApi({ ...response, workflowStatus: ORDER_STATUSES.PENDING });
          });
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersView.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    [...Array(ordersCount).keys()].forEach((index) => {
      Orders.deleteOrderViaApi(testData.orders[index].id);
    });
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C369087 Orders| Results List | Verify that value in "PO number" and "POL number" columns are hyperlinks (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C369087'] },
    () => {
      Orders.selectPendingStatusFilter();
      Orders.waitLoading();
      [...Array(ordersCount).keys()].forEach((index) => {
        const title = testData.orders[index].poNumber;
        Orders.checkSearchResults(title);

        Orders.selectFromResultsList(title);
        OrderDetails.verifyOrderTitle(`Purchase order - ${title}`);
      });
      Orders.resetFilters();
      Orders.selectOrderLines();
      OrderLines.verifyNoResultsMessage();

      OrderLines.selectStatusInSearchOrderLine(ORDER_STATUSES.PENDING);
      [...Array(ordersCount).keys()].forEach((index) => {
        const title = `${testData.orders[index].poNumber}-1`;
        OrderLines.verifyPOlineListIncludesLink(title);

        OrderLines.selectOrderline(title);
        OrderLines.verifyOrderTitlePOL(`PO Line details - ${title}`);
      });
      Orders.resetFilters();
    },
  );
});
