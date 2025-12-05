import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { NewOrder, OrderLineDetails, Orders, OrderLines } from '../../support/fragments/orders';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import orderDetails from '../../support/fragments/orders/orderDetails';
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
    location: {},
    instance: {},
  };

  const activeAccounts = [
    ' ',
    ...organization.accounts
      .filter((account) => account.accountStatus === 'Active')
      .map((account) => `${account.name} (${account.accountNo}) `),
  ];

  before('Create test data', () => {
    cy.getAdminToken();
    cy.getLocations({ limit: 1 }).then((location) => {
      testData.location = location;
    });
    InventoryInstance.createInstanceViaApi({
      instanceTitle: `Instance_${getRandomPostfix()}`,
    }).then(({ instanceData }) => {
      testData.instance = instanceData;
    });
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
      testData.order = NewOrder.getDefaultOrder({ vendorId: organizationId });
      Orders.createOrderViaApi(testData.order).then((order) => {
        testData.order = order;
      });
    });

    cy.createTempUser([Permissions.uiOrdersCreate.gui]).then((userProperties) => {
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
    'C411754 Only active account numbers are displayed in dropdown list when create POL (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C411754'] },
    () => {
      Orders.selectOrderByPONumber(testData.order.poNumber);
      orderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      Orders.createPOLineViaActions();
      OrderLines.fillPolByLinkTitle(testData.instance.instanceTitle);
      orderLineEditForm.checkSelectOptions(vendorDetailsFields.accountNumber, activeAccounts);
      OrderLines.fillInPOLineInfoForExportWithLocationAndAccountNumber(
        'Purchase',
        testData.location.name,
        `${testData.organization.accounts[0].name} (${testData.organization.accounts[0].accountNo})`,
      );
      OrderLineDetails.checkOrderLineDetails({
        vendorDetails: [{ key: 'Account number', value: testData.organization.accounts[0].name }],
      });
    },
  );
});
