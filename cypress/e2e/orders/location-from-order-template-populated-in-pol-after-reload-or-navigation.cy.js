import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ORDER_FORMAT_NAMES,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  NewOrder,
  OrderDetails,
  OrderEditForm,
  OrderLineDetails,
  OrderLineEditForm,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderTemplates } from '../../support/fragments/settings/orders';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  let testData;

  const checkTemplateLocationInNewPoLine = () => {
    OrderDetails.selectAddPOLine();
    OrderLineEditForm.checkLocationSelected({ location: testData.location.name });
  };

  before('Create test data', () => {
    const randomPostfix = getRandomPostfix();
    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C987715_Vendor_${randomPostfix}`,
      },
      orderTemplate: {},
      order: {},
      newOrderPoNumber: null,
      poLineData: {
        itemDetails: { title: `AT_C987715_POLine_${randomPostfix}` },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.OTHER,
          receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
        },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
        locationDetails: [{ quantityPhysical: '1' }],
      },
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Locations.getViaApiAnyDefault(1)
      .then(([location]) => {
        testData.location = location;
      })
      .then(() => Organizations.createOrganizationViaApi(testData.organization))
      .then(() => {
        // Precondition 1: Order template with Vendor, Order type, Currency (USD) and Location
        testData.orderTemplate = OrderTemplates.getDefaultOrderTemplate({
          additionalProperties: {
            templateName: `AT_C987715_OrderTemplate_${randomPostfix}`,
            vendor: testData.organization.id,
            orderType: 'One-Time',
            locations: [{ locationId: testData.location.id }],
          },
        });

        return OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate);
      })
      .then(() => {
        // Precondition 2: Order without PO lines created based on the order template
        return Orders.createOrderViaApi({
          ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          template: testData.orderTemplate.id,
        });
      })
      .then((order) => {
        testData.order = order;
      });

    // Precondition 3: Authorized user with required capabilities
    cy.createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrganizationsView.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        // Precondition 4: User is in "Orders" app
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.getOrdersApi({ query: `vendor=="${testData.organization.id}"` }).then((orders) => {
      orders.forEach((order) => Orders.deleteOrderViaApi(order.id, false));
    });
    OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C987715 Location from the order template is populated in PO Line after page reload or navigation from another app (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C987715'] },
    () => {
      // Step 1: Search for the Order from Preconditions and click on it
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.waitLoading();

      // Step 2: Reload the page, click "Actions" in "PO lines" accordion, select "Add PO line"
      cy.reload();
      OrderDetails.waitLoading();
      checkTemplateLocationInNewPoLine();

      // Step 3: Fill in required fields and click "Save & close"
      OrderLineEditForm.fillOrderLineFields(testData.poLineData);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkLocationsSection({
        locations: [[{ key: 'Name (code)', value: testData.location.name }]],
      });
      OrderLineDetails.backToOrderDetails();
      OrderDetails.closeOrderDetails();

      // Step 4: Click "Actions" on the "Orders" pane and select "New"
      Orders.clickCreateNewOrder();

      // Step 5: Select the order template from Preconditions and click "Save & close"
      OrderEditForm.selectOrderTemplate(testData.orderTemplate.templateName);
      OrderEditForm.clickSaveButton();
      OrderDetails.waitLoading();
      cy.getAdminToken(false).then(() => {
        Orders.getOrdersApi({ query: `vendor=="${testData.organization.id}"` }).then((orders) => {
          testData.newOrderPoNumber = orders.find(({ id }) => id !== testData.order.id).poNumber;
        });
      });
      cy.getUserToken(testData.user.username, testData.user.password);

      // Step 6: Close order details, navigate to "Organizations" app, back to "Orders" app,
      // search for the just created order and click on it
      OrderDetails.closeOrderDetails();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORGANIZATIONS);
      Organizations.waitLoading();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.waitLoading();
      Orders.resetFiltersIfActive();
      cy.then(() => {
        Orders.selectOrderByPONumber(testData.newOrderPoNumber);
      });
      OrderDetails.waitLoading();

      // Step 7: Click "Actions" in "PO lines" accordion and select "Add PO line"
      checkTemplateLocationInNewPoLine();

      // Step 8: Close "Add PO line" page, reload the page,
      // click "Actions" in "PO lines" accordion and select "Add PO line"
      OrderLineEditForm.cancelWithUnsavedChanges();
      OrderDetails.waitLoading();
      cy.reload();
      OrderDetails.waitLoading();
      checkTemplateLocationInNewPoLine();
    },
  );
});
