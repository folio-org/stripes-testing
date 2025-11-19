import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { BasicOrderLine, NewOrder, Orders, OrderLines } from '../../support/fragments/orders';
import orderDetails from '../../support/fragments/orders/orderDetails';
import orderLineDetails from '../../support/fragments/orders/orderLineDetails';
import orderLineEditForm, {
  vendorDetailsFields,
} from '../../support/fragments/orders/orderLineEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const accountConfigs = [
    { status: 'Active', name: 'Active_Account_1' },
    { status: 'Active', name: 'Active_Account_2' },
    { status: 'Inactive', name: 'Inactive_Account' },
    { status: 'Pending', name: 'Pending_Account' },
  ];

  const accounts = accountConfigs.map((cfg) => ({
    accountNo: getRandomPostfix(),
    accountStatus: cfg.status,
    name: `${cfg.name}_${getRandomPostfix()}`,
    paymentMethod: 'Cash',
  }));

  const organization = {
    ...NewOrganization.getDefaultOrganization(),
    accounts,
  };

  const testData = {
    organization,
    order: {},
    user: {},
  };

  const activeAccounts = [
    ' ',
    ...organization.accounts
      .filter((account) => account.accountStatus === 'Active')
      .map((account) => `${account.name} (${account.accountNo}) `),
  ];

  before('Create test data', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
      const order = NewOrder.getDefaultOrder({ vendorId: organizationId });
      const orderLine = BasicOrderLine.getDefaultOrderLine();
      orderLine.vendorDetail = {
        vendorAccount: testData.organization.accounts[0].accountNo,
      };
      Orders.createOrderWithOrderLineViaApi(order, orderLine).then((response) => {
        testData.order = response;
      });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C414968 Only active account numbers are displayed in dropdown list when edit POL (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C414968'] },
    () => {
      Orders.selectOrderByPONumber(testData.order.poNumber);
      orderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderLines.selectPOLInOrder();
      orderLineDetails.openOrderLineEditForm();
      orderLineEditForm.checkSelectOptions(vendorDetailsFields.accountNumber, activeAccounts);
      orderLineEditForm.fillVendorDetails({
        accountNumber: testData.organization.accounts[1].name,
      });
      orderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      orderLineDetails.checkOrderLineDetails({
        vendorDetails: [{ key: 'Account number', value: testData.organization.accounts[1].name }],
      });
    },
  );
});
