import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: NewOrder.getDefaultOrder({ vendorId: organization.id }),
    acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: true }),
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(() => {
        const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          ledger: { acqUnitIds: [testData.acqUnit.id] },
          budget: { allocated: 100 },
        });

        testData.fiscalYear = fiscalYear;
        testData.fund = fund;
        testData.budget = budget;

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.orderLine = BasicOrderLine.getDefaultOrderLine();

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;
            },
          );
        });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersEdit.gui,
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
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C407655 Open order when ledger has separate acquisition unit (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C407655'] },
    () => {
      // Open Order
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Click PO line record in "PO lines" accordion
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent();

      // Click "Actions" button, Select "Edit" option
      const OrderLineEditForm = OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      // Click "Add fund distribution" button, Select "Fund A"
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.selectFundDistribution(testData.fund.name);

      // Click "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.name }]);

      // Click "Back to PO" arrow
      OrderLineDetails.backToOrderDetails();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Click "Actions" button, Select "Open" option
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Click PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.name }]);

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = OrderLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$1.00' },
          { key: 'Source', value: testData.order.poNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
