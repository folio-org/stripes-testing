import { v4 as uuid } from 'uuid';
import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import TopMenu from '../../support/fragments/topMenu';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../support/fragments/orders/orderLines';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: {},
    order: {},
    orderLine1: {},
    orderLine2: {},
    user: {},
    location: {},
  };

  const createOrderLine = (
    purchaseOrderId,
    locationId,
    materialTypeId,
    acquisitionMethodId,
    title,
  ) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId,
      titleOrPackage: title,
      cost: {
        listUnitPrice: 100.0,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 1,
        poLineEstimatedPrice: 100.0,
      },
      locations: [
        {
          locationId,
          quantity: 1,
          quantityPhysical: 1,
        },
      ],
      acquisitionMethod: acquisitionMethodId,
      physical: {
        createInventory: 'Instance, Holding, Item',
        materialType: materialTypeId,
        materialSupplier: testData.organization.id,
        volumes: [],
      },
    };
  };

  const createOrderWithLines = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'One-Time',
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine1 = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
        `autotest_title_${Math.random() * 1000}_1`,
      );

      return OrderLines.createOrderLineViaApi(orderLine1).then((orderLine1Response) => {
        testData.orderLine1 = orderLine1Response;

        const orderLine2 = createOrderLine(
          orderResponse.id,
          locationId,
          materialTypeId,
          acquisitionMethodId,
          `autotest_title_${Math.random() * 1000}_2`,
        );

        return OrderLines.createOrderLineViaApi(orderLine2).then((orderLine2Response) => {
          testData.orderLine2 = orderLine2Response;

          return Orders.updateOrderViaApi({
            ...orderResponse,
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
      });
    });
  };

  const createOrderData = () => {
    testData.organization = NewOrganization.defaultUiOrganizations;

    return Organizations.createOrganizationViaApi(testData.organization).then(
      (organizationResponse) => {
        testData.organization.id = organizationResponse;

        return ServicePoints.getViaApi().then((servicePoint) => {
          return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
            (locationResponse) => {
              testData.location = locationResponse;

              return cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
                return cy
                  .getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
                  })
                  .then((acquisitionMethod) => {
                    return createOrderWithLines(
                      locationResponse.id,
                      materialType.id,
                      acquisitionMethod.body.acquisitionMethods[0].id,
                    );
                  });
              });
            },
          );
        });
      },
    );
  };

  before('Create test data', () => {
    cy.getAdminToken();
    OrderLinesLimit.setPOLLimitViaApi(99);
    return createOrderData().then(() => {
      cy.createTempUser([permissions.uiOrdersEdit.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C742 Set all POLs for an order to fully paid and fully received to close order as complete (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C742'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.openPolDetails(testData.orderLine1.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        { label: 'Receipt status', conditions: { value: 'Awaiting Receipt' } },
        { label: 'Payment status', conditions: { value: 'Awaiting Payment' } },
      ]);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.fillOrderLineFields({
        receiptStatus: 'Fully received',
        paymentStatus: 'Fully paid',
      });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkFieldsConditions([
        { label: 'Receipt status', conditions: { value: 'Fully Received' } },
        { label: 'Payment status', conditions: { value: 'Fully Paid' } },
      ]);
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openPolDetails(testData.orderLine2.titleOrPackage);
      OrderLineDetails.checkFieldsConditions([
        { label: 'Receipt status', conditions: { value: 'Awaiting Receipt' } },
        { label: 'Payment status', conditions: { value: 'Awaiting Payment' } },
      ]);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.fillOrderLineFields({
        receiptStatus: 'Fully received',
        paymentStatus: 'Fully paid',
      });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkFieldsConditions([
        { label: 'Receipt status', conditions: { value: 'Fully Received' } },
        { label: 'Payment status', conditions: { value: 'Fully Paid' } },
      ]);
      OrderLineDetails.backToOrderDetails();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.checkFieldsConditions([
        { label: 'Reason for closure', conditions: { value: 'Complete' } },
      ]);
      OrderDetails.openPolDetails(testData.orderLine1.titleOrPackage);
      OrderLineDetails.checkWarningMessage('Purchase order is closed - Complete');
      OrderLineDetails.checkFieldsConditions([
        { label: 'Receipt status', conditions: { value: 'Fully Received' } },
        { label: 'Payment status', conditions: { value: 'Fully Paid' } },
      ]);
    },
  );
});
