import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        budget: { allocated: 100 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          listUnitPrice: 98,
          fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
        });

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
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
    Orders.deleteOrderViaApi(testData.order.id);
    Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C380392 Encumbrance is released when an Order was closed automatically (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C380392'] },
    () => {
      // Click on the Order
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Click on PO line on "Purchase order" pane
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: 'Payment status', value: 'Awaiting Payment' },
          { key: 'Receipt status', value: 'Awaiting Receipt' },
        ],
      });

      // Click "Actions" button, Select "Edit" option
      const OrderLineEditForm = OrderLineDetails.openOrderLineEditForm();

      // Make changes in "PO line details", Click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        paymentStatus: 'Payment not required',
      });
      OrderLineEditForm.fillOrderLineFields({
        receiptStatus: 'Receipt not required',
      });
      OrderLineEditForm.clickSaveButton();

      // Warning message "Purchase order is closed - Complete" appears
      OrderLineDetails.checkWarningMessage('Purchase order is closed - Complete');
      // "Current encumbrance" field contains "$0.00"
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          currentEncumbrance: '0.00',
        },
      ]);

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = OrderLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.order.poNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Status', value: 'Released' },
        ],
      });
    },
  );
});
