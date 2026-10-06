import {
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import AcqVersionHistory from '../../support/fragments/acqVersionHistory';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../support/fragments/inventory/versionHistorySection';
import { BasicOrderLine, NewOrder, OrderDetails, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { formatDateTime } from '../../support/utils/acquisitions';
import getRandomPostfix from '../../support/utils/stringTools';
import { getFullName } from '../../support/utils/users';

describe('Orders', () => {
  const entityType = 'order';
  const closeReason = 'Cancelled';
  const testData = {};
  const versionsCount = 3;
  const originalVersionIndex = versionsCount - 1;

  const checkVersionHistoryCards = () => {
    const expectedCards = [
      { isCurrent: true, changedFields: [ORDER_VIEW_FIELD_LABELS.APPROVED] },
      { changedFields: [ORDER_VIEW_FIELD_LABELS.RE_ENCUMBER] },
      { isOriginal: true },
    ];

    AcqVersionHistory.verifyVersionsCount(entityType, versionsCount);

    expectedCards.forEach((card, index) => {
      AcqVersionHistory.assertVersionHistoryCard(entityType, {
        ...card,
        index,
        eventDate: testData.eventDates[index],
        source: testData.adminName,
      });
    });
  };

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C369046_Organization_${getRandomPostfix()}`,
    };
    testData.orderLine = BasicOrderLine.getDefaultOrderLine({
      title: `AT_C369046_POLTitle_${getRandomPostfix()}`,
    });

    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => {
      testData.locale = locale;
    });
    cy.getAdminUserDetails().then((adminUser) => {
      testData.adminName = getFullName(adminUser);
    });
    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      // order is created not approved, so it can be edited to "Approved" afterwards
      testData.order = {
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        approved: false,
      };
      Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine);
    });
    // edit the order twice to have at least one version between the original and the current one
    cy.then(() => Orders.getOrderByIdViaApi(testData.order.id)).then((order) => {
      Orders.updateOrderViaApi({ ...order, reEncumber: true });
    });
    cy.then(() => Orders.getOrderByIdViaApi(testData.order.id)).then((order) => {
      testData.order = order;
      Orders.updateOrderViaApi({ ...order, approved: true });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;
      testData.userName = `${userProperties.username}, ${userProperties.firstName}`;

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
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.orderLine.titleOrPackage);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C369046 "Version history" viewing for Order (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C369046'] },
    () => {
      cy.intercept('GET', `/audit-data/acquisition/order/${testData.order.id}*`).as(
        'versionHistory',
      );

      // Step 1: Click on the Order - "Version history" icon is displayed
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();

      // Step 2: Hover over "Version history" icon - tooltip is displayed
      Orders.checkVersionHistoryButtonTooltip();

      // Step 3: Click "Version history" icon - versions are displayed from most recent to least recent
      Orders.openVersionHistory();
      cy.wait('@versionHistory').then(({ response }) => {
        const formatEventDate = ({ eventDate }) => formatDateTime(testData.locale, eventDate);

        testData.eventDates = response.body.orderAuditEvents.map(formatEventDate);
      });
      cy.then(() => {
        checkVersionHistoryCards();
        Orders.checkHighlightedFieldsInVersionView([ORDER_VIEW_FIELD_LABELS.APPROVED]);

        // Step 4: Click "Version history" icon on the last card - original version is displayed
        AcqVersionHistory.selectVersionHistoryCard(entityType, { index: originalVersionIndex });
        AcqVersionHistory.checkVersionHistoryCardIsActive(entityType, {
          index: originalVersionIndex,
        });
        Orders.checkHighlightedFieldsInVersionView([]);
        Orders.checkFieldsInVersionHistoryView([
          { key: ORDER_VIEW_FIELD_LABELS.CREATED_BY, value: testData.adminName },
          {
            key: ORDER_VIEW_FIELD_LABELS.CREATED_ON,
            value: testData.eventDates[originalVersionIndex],
          },
        ]);

        // Step 5: Click "View this version" icon on the first card - current version is displayed
        AcqVersionHistory.selectVersionHistoryCard(entityType, { index: 0 });
        AcqVersionHistory.checkVersionHistoryCardIsActive(entityType, { index: 0 });
        AcqVersionHistory.assertVersionHistoryCard(entityType, {
          index: 0,
          isCurrent: true,
          source: testData.adminName,
          changedFields: [ORDER_VIEW_FIELD_LABELS.APPROVED],
        });
        Orders.checkHighlightedFieldsInVersionView([ORDER_VIEW_FIELD_LABELS.APPROVED]);
        Orders.checkFieldsInVersionHistoryView([
          { key: ORDER_VIEW_FIELD_LABELS.CREATED_BY, value: testData.adminName },
          {
            key: ORDER_VIEW_FIELD_LABELS.CREATED_ON,
            value: testData.eventDates[originalVersionIndex],
          },
        ]);

        // Step 6: Click title link on a card except the first and the last
        AcqVersionHistory.clickVersionHistoryCardTitle(entityType, { index: 1 });
        AcqVersionHistory.checkVersionHistoryCardIsActive(entityType, { index: 1 });
        Orders.checkHighlightedFieldsInVersionView([ORDER_VIEW_FIELD_LABELS.RE_ENCUMBER]);

        // Step 7: Click "X" on "Version history" pane - "PO lines" and "Related invoices" are displayed
        Orders.closeVersionHistory();

        // Step 8: Click "Version history" icon again
        Orders.openVersionHistory();
      });
      cy.wait('@versionHistory');
      cy.then(() => checkVersionHistoryCards());

      // Step 9: Click "X" on "Purchase order" pane - only "Search & filter" and "Orders" panes are displayed
      OrderDetails.closeOrderDetails({ isVersionView: true });
      VersionHistorySection.checkPaneShown(false);
      OrderDetails.checkPurchaseOrderPaneAbsent();
      Orders.waitLoading();

      // Step 10: Click on the Order again
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();

      // Steps 11-13: "Actions" -> "Edit", check "Manual" checkbox, click "Save & close"
      Orders.editOrderToManual(testData.order.poNumber);

      // Step 14: Click "Version history" icon - current version contains "Manual" change
      Orders.openVersionHistory();
      cy.wait('@versionHistory');
      // one more version is added by the "Manual" edit
      AcqVersionHistory.verifyVersionsCount(entityType, versionsCount + 1);
      AcqVersionHistory.checkVersionHistoryCardIsActive(entityType, { index: 0 });
      AcqVersionHistory.assertVersionHistoryCard(entityType, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: [ORDER_VIEW_FIELD_LABELS.MANUAL],
      });
      Orders.checkHighlightedFieldsInVersionView([ORDER_VIEW_FIELD_LABELS.MANUAL]);

      // Step 15: Click "X" on "Version history" pane
      Orders.closeVersionHistory();

      // Step 16: "Actions" -> "Open" -> "Submit" - "Approval date" is populated
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderDetails({
        orderInformation: [
          {
            key: ORDER_VIEW_FIELD_LABELS.APPROVAL_DATE,
            value: formatDateTime(testData.locale, new Date()).split(',')[0],
          },
        ],
      });

      // Step 17: "Actions" -> "Close order", select reason, click "Submit"
      Orders.closeOrder(closeReason);

      // Step 18: Click "Version history" icon - current version contains "Workflow status" change
      Orders.openVersionHistory();
      cy.wait('@versionHistory');
      AcqVersionHistory.verifyVersionsCount(entityType, versionsCount + 3);
      AcqVersionHistory.checkVersionHistoryCardIsActive(entityType, { index: 0 });
      AcqVersionHistory.assertVersionHistoryCard(entityType, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: [ORDER_VIEW_FIELD_LABELS.WORKFLOW_STATUS],
      });
      Orders.checkHighlightedFieldsInVersionView([ORDER_STATUSES.CLOSED]);
      Orders.checkFieldsInVersionHistoryView([
        { key: ORDER_VIEW_FIELD_LABELS.WORKFLOW_STATUS, value: ORDER_STATUSES.CLOSED },
      ]);
    },
  );
});
