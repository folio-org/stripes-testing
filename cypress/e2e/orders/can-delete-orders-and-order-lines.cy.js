import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import NewOrder from '../../support/fragments/orders/newOrder';
import Organizations from '../../support/fragments/organizations/organizations';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Orders from '../../support/fragments/orders/orders';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_LINE_SEARCH_INDEX_LABELS,
  ORDER_SEARCH_OPTIONS,
} from '../../support/constants';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    user: {},
  };

  before(() => {
    cy.getAdminToken().then(() => {
      OrderLinesLimit.setPOLLimitViaApi(3);
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
        }).then(({ body }) => {
          const acquisitionMethod = body.acquisitionMethods[0].id;
          const createOrder = () => Orders.createOrderViaApi(
            NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
          );
          const createOrderLine = (purchaseOrderId) => OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({ purchaseOrderId, acquisitionMethod }),
          );

          createOrder().then((order1) => {
            testData.order1 = order1;
            createOrderLine(order1.id).then((firstPOL) => {
              testData.firstPOL = firstPOL;
            });
            createOrderLine(order1.id).then((secondPOL) => {
              testData.secondPOL = secondPOL;
            });
          });

          createOrder().then((order2) => {
            testData.order2 = order2;
            createOrderLine(order2.id);
          });
        });
      });

      cy.createTempUser([Permissions.uiOrdersView.gui, Permissions.uiOrdersDelete.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.orderLinesPath,
            waiter: OrderLines.waitLoading,
          });
        },
      );
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order1.id, false);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C2395 Orders: Can delete Orders and Order lines (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C2395'] },
    () => {
      // Delete order line from Order lines toggle
      OrderLines.searchByParameter(
        ORDER_LINE_SEARCH_INDEX_LABELS.POL_NUMBER,
        testData.secondPOL.poLineNumber,
      );
      OrderLines.selectOrderline(testData.secondPOL.poLineNumber);
      OrderLines.waitLoading();
      OrderLines.deleteOrderLine({
        poLineNumber: testData.secondPOL.poLineNumber,
        checkDeleteSuccessMessage: true,
      });
      OrderLineDetails.checkPOLinePaneAbsent();

      // Select Orders toggle and delete order
      Orders.selectOrdersPane();
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order2.poNumber);
      Orders.selectFromResultsList(testData.order2.poNumber);
      Orders.waitLoading();
      Orders.deleteOrderViaActions({
        poNumber: testData.order2.poNumber,
        checkDeleteSuccessMessage: true,
      });
      OrderDetails.checkPurchaseOrderPaneAbsent();

      // Delete order line from Order toggle
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
      Orders.waitLoading();
      Orders.selectFromResultsList(testData.order1.poNumber);
      OrderDetails.openPolDetails(testData.firstPOL.titleOrPackage);
      OrderLines.deleteOrderLine({
        poLineNumber: testData.firstPOL.poLineNumber,
        checkDeleteSuccessMessage: true,
      });
      OrderDetails.checkOrderLinesTableContent([]);
    },
  );
});
