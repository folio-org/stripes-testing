import { Permissions } from '../../support/dictionary';
import { NewOrder, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ORDER_STATUSES } from '../../support/constants';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint);

      testData.location = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      Locations.createViaApi(testData.location);

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

        Orders.createOrderViaApi(testData.order).then((order) => {
          testData.order = order;
        });
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
      Locations.deleteViaApi(testData.location);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C367957 Orders POL location dropdown search textbox allows use of parentheses characters (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C367957'] },
    () => {
      // Click on the record with Order name from precondition
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Click Actions, Add PO line in "PO lines accordion" on "Purchase order" pane
      const OrderLineEditForm = OrderDetails.selectAddPOLine();

      // Click "Add location" button in "Location" accordion in the bottom of the page
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.checkLocationDetailsSection();

      // Click on the "Name (code)" dropdown
      // In "Filter options list" field type one parentheses character "("
      OrderLineEditForm.searchLocationByName({ name: '(' });

      // In "Filter options list" field type one parentheses character ")"
      OrderLineEditForm.searchLocationByName({ name: ')', open: false });
    },
  );
});
