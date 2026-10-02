import { ORDER_SEARCH_OPTIONS } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import AcqVersionHistory from '../../support/fragments/acqVersionHistory';
import VersionHistorySection from '../../support/fragments/inventory/versionHistorySection';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { formatDateTime } from '../../support/utils/acquisitions';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const orderEntityType = 'order';
  const orderLineEntityType = 'order-line';
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C410833_Organization_${getRandomPostfix()}`,
    };
    testData.orderLine = BasicOrderLine.getDefaultOrderLine({
      title: `AT_C410833_POLTitle_${getRandomPostfix()}`,
    });

    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => {
      testData.locale = locale;
    });
    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      Orders.createOrderWithOrderLineViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        testData.orderLine,
      ).then((order) => {
        testData.order = order;
      });
    });
    cy.get('@orderLine').then((orderLine) => {
      testData.orderLine = orderLine;
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C410833 View order and order line with empty "Version history" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C410833'] },
    () => {
      cy.intercept('GET', `/audit-data/acquisition/order/${testData.order.id}*`).as(
        'orderVersionHistory',
      );
      cy.intercept('GET', `/audit-data/acquisition/order-line/${testData.orderLine.id}*`).as(
        'orderLineVersionHistory',
      );

      // Step 1: Click on the Order - "Purchase order" pane with "Version history" icon is displayed
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();

      // Step 2: Click "Version history" icon - one card with "Current version" and "Original version" labels
      Orders.openVersionHistory();
      cy.wait('@orderVersionHistory').then(({ response }) => {
        AcqVersionHistory.verifyVersionsCount(orderEntityType, 1);
        AcqVersionHistory.assertVersionHistoryCard(orderEntityType, {
          index: 0,
          eventDate: formatDateTime(testData.locale, response.body.orderAuditEvents[0].eventDate),
          isCurrent: true,
          isOriginal: true,
          isChangedListAbsent: true,
        });
      });

      // Step 3: Click "X" on "Version history" pane - "PO lines" and "Related invoices" accordions are displayed
      Orders.closeVersionHistory();

      // Step 4: Click "Version history" icon again
      Orders.openVersionHistory();
      cy.wait('@orderVersionHistory').then(({ response }) => {
        AcqVersionHistory.verifyVersionsCount(orderEntityType, 1);
        AcqVersionHistory.assertVersionHistoryCard(orderEntityType, {
          index: 0,
          eventDate: formatDateTime(testData.locale, response.body.orderAuditEvents[0].eventDate),
          isCurrent: true,
          isOriginal: true,
          isChangedListAbsent: true,
        });
      });

      // Step 5: Click "X" on "Purchase order" pane - only "Search & filter" and "Orders" panes are displayed
      OrderDetails.closeOrderDetails({ isVersionView: true });
      VersionHistorySection.checkPaneShown(false);
      OrderDetails.checkPurchaseOrderPaneAbsent();
      Orders.waitLoading();

      // Step 6: Click on the Order again
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();

      // Step 7: Click on PO line record in "PO lines" accordion - "PO Line details" pane is displayed
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);

      // Step 8: Click "Version history" icon - one card with "Current version" and "Original version" labels
      OrderLineDetails.openVersionHistory();
      cy.wait('@orderLineVersionHistory').then(({ response }) => {
        AcqVersionHistory.verifyVersionsCount(orderLineEntityType, 1);
        AcqVersionHistory.assertVersionHistoryCard(orderLineEntityType, {
          index: 0,
          eventDate: formatDateTime(
            testData.locale,
            response.body.orderLineAuditEvents[0].eventDate,
          ),
          isCurrent: true,
          isOriginal: true,
          isChangedListAbsent: true,
        });
      });

      // Step 9: Click "X" on "Version history" pane - "PO Line details" pane is displayed
      AcqVersionHistory.closeVersionHistory(orderLineEntityType);
      VersionHistorySection.checkPaneShown(false);
      OrderLineDetails.waitLoading();
    },
  );
});
