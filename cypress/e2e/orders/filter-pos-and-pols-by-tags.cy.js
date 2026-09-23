import { ORDER_FILTER_LABELS, ORDER_LINE_FILTER_LABELS } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const ORDER_TAGS_FILTER = ORDER_FILTER_LABELS.TAGS;
const ORDER_LINE_TAGS_FILTER = ORDER_LINE_FILTER_LABELS.TAGS;

describe('Orders', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    vendor: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C6716_Vendor_${randomPostfix}`,
    },
    // Tags containing only one special character each
    orderLineTag: `atc6716line/line${randomPostfix}`,
    orderTag: `atc6716test!${randomPostfix}`,
    orderLineTitle: `AT_C6716_Line_${randomPostfix}`,
    tagIds: [],
    orders: [],
    user: {},
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();

    // Precondition: two tags with a single special character are created
    cy.createTagApi({ label: testData.orderLineTag }).then((tagId) => {
      testData.tagIds.push(tagId);
    });
    cy.createTagApi({ label: testData.orderTag }).then((tagId) => {
      testData.tagIds.push(tagId);
    });

    Organizations.createOrganizationViaApi(testData.vendor).then((vendorId) => {
      testData.vendor.id = vendorId;

      cy.getAcquisitionMethodsApi({ limit: 1 }).then(({ body }) => {
        testData.acquisitionMethodId = body.acquisitionMethods[0].id;

        // Precondition: Order #1 with one PO line, PO line has a tag with forward slash
        Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: testData.vendor.id })).then(
          (order) => {
            testData.firstOrder = order;
            testData.orders.push(order);

            OrderLines.createOrderLineViaApi({
              ...BasicOrderLine.getDefaultOrderLine({
                title: testData.orderLineTitle,
                purchaseOrderId: order.id,
                acquisitionMethod: testData.acquisitionMethodId,
              }),
              tags: { tagList: [testData.orderLineTag] },
            }).then((orderLine) => {
              testData.firstOrderLine = orderLine;
            });
          },
        );

        // Precondition: Order #2 without PO lines, PO has a tag with a special character
        Orders.createOrderViaApi({
          ...NewOrder.getDefaultOrder({ vendorId: testData.vendor.id }),
          tags: { tagList: [testData.orderTag] },
        }).then((order) => {
          testData.secondOrder = order;
          testData.orders.push(order);
        });
      });
    });

    // Precondition: user with "Orders: Can view Orders and Order lines" permission is logged in
    cy.createTempUser([permissions.uiOrdersView.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    testData.orders.forEach((order) => {
      Orders.deleteOrderViaApi(order.id, false);
    });
    testData.tagIds.forEach((tagId) => {
      cy.deleteTagApi(tagId, true);
    });
    Organizations.deleteOrganizationViaApi(testData.vendor.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C6716 Filter POs and POLs by tags (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C6716'] },
    () => {
      // Step 1: Expand "Tags" accordion on "Search & filter" pane of "Orders" pane
      Orders.resetFiltersIfActive();
      cy.wait(1000);
      Orders.expandFilterAccordion(ORDER_TAGS_FILTER);
      Orders.assertMultiSelectFilterValues(ORDER_TAGS_FILTER, []);

      // Step 2: Select the tag added to PO line of Order #1
      Orders.filterByTags([testData.orderLineTag]);
      Orders.assertMultiSelectFilterValues(ORDER_TAGS_FILTER, [testData.orderLineTag]);
      Orders.checkZeroSearchResultsHeader();
      Orders.assertNoResultsFound();

      // Step 3: Click "Reset all" button
      Orders.resetAllFilters();
      Orders.assertNoFiltersApplied();

      // Step 4: Select the tag added to Order #2
      Orders.filterByTags([testData.orderTag]);
      Orders.assertMultiSelectFilterValues(ORDER_TAGS_FILTER, [testData.orderTag]);
      Orders.checkSearchResults(testData.secondOrder.poNumber);
      Orders.assertResultsCount(1);

      // Step 5: Select one more tag from preconditions
      Orders.filterByTags([testData.orderLineTag]);
      Orders.assertMultiSelectFilterValues(ORDER_TAGS_FILTER, [
        testData.orderTag,
        testData.orderLineTag,
      ]);
      Orders.checkSearchResults(testData.secondOrder.poNumber);
      Orders.assertResultsCount(1);

      // Step 6: Select "Order lines" toggle on "Search & filter" pane
      Orders.selectOrderLines();
      OrderLines.waitLoading();

      // Step 7: Expand "Tags" accordion on "Search & filter" pane
      OrderLines.clearAllFilters();
      OrderLines.assertNoFiltersApplied();
      OrderLines.assertMultiSelectFilterValues(ORDER_LINE_TAGS_FILTER, []);

      // Step 8: Select the tag added to PO line of Order #1
      OrderLines.filterByTags([testData.orderLineTag]);
      OrderLines.assertMultiSelectFilterValues(ORDER_LINE_TAGS_FILTER, [testData.orderLineTag]);
      OrderLines.assertTitlesInResults([testData.orderLineTitle]);

      // Step 9: Click "Reset all" button
      OrderLines.clearAllFilters();
      OrderLines.assertNoFiltersApplied();

      // Step 10: Select the tag added to Order #2
      OrderLines.filterByTags([testData.orderTag]);
      OrderLines.assertMultiSelectFilterValues(ORDER_LINE_TAGS_FILTER, [testData.orderTag]);
      OrderLines.verifyTitlesAbsentInResults([testData.orderLineTitle]);
      OrderLines.assertResultsCount(0);
      OrderLines.verifyNoResultsFoundMessage();

      // Step 11: Select one more tag from preconditions
      OrderLines.filterByTags([testData.orderLineTag]);
      OrderLines.assertMultiSelectFilterValues(ORDER_LINE_TAGS_FILTER, [
        testData.orderTag,
        testData.orderLineTag,
      ]);
      OrderLines.assertTitlesInResults([testData.orderLineTitle]);
      OrderLines.assertResultsCount(1);
      OrderLines.verifyTitlesAbsentInResults([testData.secondOrder.poNumber]);
    },
  );
});
