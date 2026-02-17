import { Permissions } from '../../support/dictionary';
import { InventoryInstance } from '../../support/fragments/inventory';
import { NewOrder, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ORDER_STATUSES } from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import SelectInstanceModal from '../../support/fragments/orders/modals/selectInstanceModal';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id });

        Orders.createOrderViaApi(testData.order).then((order) => {
          testData.order = order;
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrdersEdit.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C377043 Plugin search result list is cleared and all filters are reset by clicking "Reset all" button while adding PO line to "Purchase order" (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C377043'] },
    () => {
      // Click on the record with Order name from precondition
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderDetails({
        summary: [{ key: 'Workflow status', value: ORDER_STATUSES.PENDING }],
      });

      // Click "Actions" button in "PO lines" accordion, Select "+Add PO line" option
      OrderDetails.selectAddPOLine();

      // Click "Title look-up" link below "Title" field in "Item details" accordion
      OrderLineEditForm.clickTitleLookUpButton();

      // Enter any value in the "Search" field, Click on the "Search" button
      SelectInstanceModal.searchByName(testData.instance.instanceTitle);
      SelectInstanceModal.checkTableContent({
        records: [{ title: testData.instance.instanceTitle }],
      });

      // Click on the "Reset all" button on "Search & filter" pane
      SelectInstanceModal.clickResetAllButton();
      SelectInstanceModal.checkTableContent({
        records: [],
      });
    },
  );
});
