import Permissions from '../../support/dictionary/permissions';
import OrderLines from '../../support/fragments/orders/orderLines';
import getRandomPostfix from '../../support/utils/stringTools';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import DateTools from '../../support/utils/dateTools';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';

describe('Orders', () => {
  let user;
  let adminSourceRecord;
  const orderLineTitle = `autotest_po_line_name-${getRandomPostfix()}`;
  const orderLinesCount = 3;
  const organization = NewOrganization.getDefaultOrganization({ accounts: 1 });
  const testData = {
    organization,
    orderLines: [],
    integrations: [],
    order: NewOrder.getDefaultOrder({ vendorId: organization.id, manualPo: false }),
  };

  describe('Create test data', () => {
    before(() => {
      cy.getAdminToken().then(() => {
        cy.getAdminSourceRecord().then((record) => {
          adminSourceRecord = record;
        });
        OrderLinesLimit.setPOLLimitViaApi(10);

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          }).then(({ body: { acquisitionMethods } }) => {
            const acqMethod = acquisitionMethods.find(
              ({ value }) => value === ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            );

            Orders.createOrderViaApi(testData.order).then((order) => {
              testData.order = order;

              [...Array(orderLinesCount).keys()].forEach((index) => {
                testData.orderLines.push(
                  BasicOrderLine.getDefaultOrderLine({
                    acquisitionMethod: acqMethod.id,
                    purchaseOrderId: testData.order.id,
                    title: orderLineTitle,
                  }),
                );
                OrderLines.createOrderLineViaApi(testData.orderLines[index]);
              });
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      OrderLinesLimit.setPOLLimitViaApi(1);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C375995 Version history card without changes is not displayed in "Version history" log (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C375995'] },
      () => {
        const poNumber = testData.order.poNumber;

        const OrderDetails = Orders.selectOrderByPONumber(poNumber);
        OrderDetails.checkOrderDetails({
          summary: [{ key: 'Workflow status', value: ORDER_STATUSES.PENDING }],
        });
        OrderDetails.verifyOrderTitle(`Purchase order - ${poNumber}`);

        OrderDetails.openOrder({ orderNumber: poNumber });
        InteractorsTools.checkCalloutMessage(
          `The Purchase order - ${poNumber} has been successfully opened`,
        );
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        [...Array(orderLinesCount).keys()].forEach((index) => {
          const OrderLineDetails = OrderDetails.openPolDetails(`${poNumber}-${index + 1}`);
          OrderLineDetails.checkOrderLineDetails({
            purchaseOrderLineInformation: [{ key: 'Payment status', value: 'Awaiting Payment' }],
          });
          OrderLineDetails.verifyLinesDetailTitle(`PO Line details - ${poNumber}-${index + 1}`);

          const firstDate = DateTools.getCurrentUTCTime();
          const firstCardText = [`Source: ${adminSourceRecord}`, 'Original version'];
          const secondDate = DateTools.getCurrentUTCTime();
          const secondCardText = [
            `Source: ${user.username}, ${user.firstName}`,
            'Current version',
            'Changed',
            'Payment status',
            'Receipt status',
          ];
          const VersionHistory = OrderLineDetails.openVersionHistory();
          VersionHistory.veriifyIconClockExists();
          VersionHistory.veriifyVersionHistoryCardDate(firstDate);
          firstCardText.forEach((text) => {
            VersionHistory.veriifyVersionHistoryCardText(text);
          });
          VersionHistory.veriifyVersionHistoryCardDate(secondDate);
          secondCardText.forEach((text) => {
            VersionHistory.veriifyVersionHistoryCardText(text);
          });

          VersionHistory.closeVersionHistory();
          OrderLineDetails.backToOrderDetails();
        });
      },
    );
  });
});
