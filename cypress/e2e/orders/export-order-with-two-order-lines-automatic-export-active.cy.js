import moment from 'moment';
import {
  APPLICATION_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../support/fragments/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('Orders', () => {
  describe('Export in edifact format', () => {
    const now = moment();
    const orderLinesCount = 2;
    const organization = NewOrganization.getDefaultOrganization({ accounts: 1 });
    const testData = {
      organization,
      order: NewOrder.getDefaultOrder({ vendorId: organization.id, manualPo: false }),
      orderLines: [],
      integrations: [],
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        OrderLinesLimit.setPOLLimitViaApi(orderLinesCount);

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          }).then(({ body: { acquisitionMethods } }) => {
            const acqMethod = acquisitionMethods.find(
              ({ value }) => value === ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            );

            Orders.createOrderViaApi(testData.order)
              .then((order) => {
                testData.order = order;

                [...Array(orderLinesCount).keys()].forEach((index) => {
                  testData.orderLines.push(
                    BasicOrderLine.getDefaultOrderLine({
                      acquisitionMethod: acqMethod.id,
                      automaticExport: true,
                      purchaseOrderId: testData.order.id,
                      vendorAccount: `${organization.accounts[0].accountNo}-0{${index + 1}}`,
                    }),
                  );
                  OrderLines.createOrderLineViaApi(testData.orderLines[index]);

                  now.set('second', now.second() + 10);
                  testData.integrations.push(
                    Integrations.getDefaultIntegration({
                      vendorId: organization.id,
                      acqMethodId: acqMethod.id,
                      accountNoList: [`${organization.accounts[0].accountNo}-0{${index + 1}}`],
                      scheduleTime: now.utc().format('HH:mm:ss'),
                    }),
                  );

                  Integrations.createIntegrationViaApi(testData.integrations[index]);
                });

                Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
              })
              .then(() => {
                testData.orderLines.forEach(({ id: orderLineId }) => {
                  // wait for export complition
                  cy.wait(10 * 1000);

                  OrderLines.getOrderLineByIdViaApi(orderLineId).then((orderLine) => {
                    OrderLines.updateOrderLineViaApi({ ...orderLine, lastEDIExportDate: null });
                  });
                });
              });
          });
        });
      });

      cy.createTempUser([Permissions.exportManagerAll.gui, Permissions.uiOrdersView.gui]).then(
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
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      OrderLinesLimit.setPOLLimitViaApi(1);
      testData.integrations.forEach(({ id }) => Integrations.deleteIntegrationViaApi(id));
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C350545 "Purchase order" and "PO Line Details" display export details accordion for 2 exported order lines (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C350545'] },
      () => {
        // Search for exported order and click on it
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Expand "Export details" accordion
        // "Export details" table contains two records for each exported order lines
        OrderDetails.checkExportDetailsTableContent([
          {
            date: now.utc().format('MM/DD/YYYY'),
            name: testData.organization.code,
            configName: testData.integrations[0].configName,
          },
          {
            date: now.utc().format('MM/DD/YYYY'),
            name: testData.organization.code,
            configName: testData.integrations[1].configName,
          },
        ]);

        // Click on any "Export Job ID" link
        const ExportDetails = OrderDetails.openExportJobDetails();
        ExportDetails.checkExportJobDetails([
          { key: 'Status', value: 'Successful' },
          { key: 'Source', value: 'System' },
          { key: 'Organization', value: testData.organization.name },
          { key: 'Export method', value: testData.integrations[0].configName },
        ]);

        // Go back to "Orders" app and click on "PO line #1" record in "PO lines" accordion
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrderByPONumber(testData.order.poNumber);
        const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLines[0].titleOrPackage);

        // Expand "Export details" accordion
        OrderLineDetails.expandExportJobDetails();
        OrderLineDetails.checkExportDetailsTableContent([
          {
            date: now.utc().format('MM/DD/YYYY'),
            name: testData.organization.code,
            configName: testData.integrations[0].configName,
          },
        ]);

        // Click "Back" button on the left top corner
        OrderLineDetails.backToOrderDetails();

        // Click on "PO line #2" record in "PO lines" accordion
        OrderDetails.openPolDetails(testData.orderLines[1].titleOrPackage);

        // Expand "Export details" accordion
        OrderLineDetails.expandExportJobDetails();
        OrderLineDetails.checkExportDetailsTableContent([
          {
            date: now.utc().format('MM/DD/YYYY'),
            name: testData.organization.code,
            configName: testData.integrations[1].configName,
          },
        ]);
      },
    );
  });
});
