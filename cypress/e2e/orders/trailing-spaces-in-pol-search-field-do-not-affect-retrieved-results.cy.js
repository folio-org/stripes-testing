import uuid from 'uuid';
import {
  ORDER_LINE_SEARCH_INDEX_LABELS,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const orderLinesButtonName = 'Order lines';
  const isbnProductIdTypeName = 'ISBN';
  const isbnProductId = '9781868885015';
  const testData = {};

  before(() => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C350739_Organization_${getRandomPostfix()}`,
    };
    testData.orderLineTag = `atc350739tag${getRandomPostfix()}`;
    testData.orders = [];
    testData.searches = [];

    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.createTagApi({ label: testData.orderLineTag }).then((tagId) => {
      testData.tagId = tagId;
    });
    cy.getProductIdTypes({ query: `name=="${isbnProductIdTypeName}"` }).then((productIdType) => {
      testData.isbnProductIdTypeId = productIdType.id;
    });
    cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;

      // Each PO line has only one of the searchable fields populated
      [
        {
          searchOptions: [ORDER_LINE_SEARCH_INDEX_LABELS.CONTRIBUTOR],
          descriptor: 'Contributor',
          fields: {
            contributors: [
              {
                contributor: `AT_C350739_Contributor_${getRandomPostfix()}`,
                contributorNameTypeId: uuid(),
              },
            ],
          },
          getSearchValue: (orderLine) => orderLine.contributors[0].contributor,
        },
        {
          searchOptions: [ORDER_LINE_SEARCH_INDEX_LABELS.POL_NUMBER],
          descriptor: 'PolNumber',
          getSearchValue: (orderLine) => orderLine.poLineNumber,
        },
        {
          searchOptions: [ORDER_LINE_SEARCH_INDEX_LABELS.REQUESTER],
          descriptor: 'Requester',
          fields: { requester: `AT_C350739_Requester_${getRandomPostfix()}` },
          getSearchValue: (orderLine) => orderLine.requester,
        },
        {
          searchOptions: [ORDER_LINE_SEARCH_INDEX_LABELS.TITLE_OR_PACKAGE],
          descriptor: 'Title',
          getSearchValue: (orderLine) => orderLine.titleOrPackage,
        },
        {
          searchOptions: [ORDER_LINE_SEARCH_INDEX_LABELS.PUBLISHER],
          descriptor: 'Publisher',
          fields: { publisher: `AT_C350739_Publisher_${getRandomPostfix()}` },
          getSearchValue: (orderLine) => orderLine.publisher,
        },
        {
          searchOptions: [ORDER_LINE_SEARCH_INDEX_LABELS.VENDOR_ACCOUNT],
          descriptor: 'VendorAccount',
          vendorDetail: { vendorAccount: `AT_C350739_VendorAccount_${getRandomPostfix()}` },
          getSearchValue: (orderLine) => orderLine.vendorDetail.vendorAccount,
        },
        {
          searchOptions: [ORDER_LINE_SEARCH_INDEX_LABELS.VENDOR_REF_NUMBER],
          descriptor: 'RefNumber',
          vendorDetail: {
            referenceNumbers: [
              {
                refNumber: `AT_C350739_RefNumber_${getRandomPostfix()}`,
                refNumberType: 'Vendor title number',
              },
            ],
          },
          getSearchValue: (orderLine) => orderLine.vendorDetail.referenceNumbers[0].refNumber,
        },
        {
          searchOptions: [ORDER_LINE_SEARCH_INDEX_LABELS.DONOR_DEPRECATED],
          descriptor: 'Donor',
          fields: { donor: `AT_C350739_Donor_${getRandomPostfix()}` },
          getSearchValue: (orderLine) => orderLine.donor,
        },
        {
          searchOptions: [ORDER_LINE_SEARCH_INDEX_LABELS.SELECTOR],
          descriptor: 'Selector',
          fields: { selector: `AT_C350739_Selector_${getRandomPostfix()}` },
          getSearchValue: (orderLine) => orderLine.selector,
        },
        {
          searchOptions: [ORDER_LINE_SEARCH_INDEX_LABELS.VOLUMES],
          descriptor: 'Volumes',
          fields: {
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.NONE,
              materialSupplier: organizationId,
              volumes: [`AT_C350739_Volume_${getRandomPostfix()}`],
            },
          },
          getSearchValue: (orderLine) => orderLine.physical.volumes[0],
        },
        {
          searchOptions: [
            ORDER_LINE_SEARCH_INDEX_LABELS.PRODUCT_ID,
            ORDER_LINE_SEARCH_INDEX_LABELS.PRODUCT_ID_ISBN,
          ],
          descriptor: 'ProductId',
          fields: {
            details: {
              productIds: [
                { productId: isbnProductId, productIdType: testData.isbnProductIdTypeId },
              ],
              subscriptionInterval: 0,
            },
          },
          getSearchValue: (orderLine) => orderLine.details.productIds[0].productId,
        },
      ].forEach(({ searchOptions, descriptor, fields, vendorDetail, getSearchValue }) => {
        Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: organizationId })).then(
          (order) => {
            testData.orders.push(order);

            OrderLines.createOrderLineViaApi({
              ...BasicOrderLine.getDefaultOrderLine({
                title: `AT_C350739_OrderLine_${descriptor}_${getRandomPostfix()}`,
                purchaseOrderId: order.id,
                acquisitionMethod: testData.acquisitionMethodId,
                vendorDetail: { instructions: '', ...vendorDetail },
              }),
              ...fields,
              tags: { tagList: [testData.orderLineTag] },
            }).then((orderLine) => {
              searchOptions.forEach((name) => {
                testData.searches.push({ name, value: getSearchValue(orderLine), orderLine });
              });
            });
          },
        );
      });
    });

    cy.createTempUser([
      Permissions.uiOrdersView.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersDelete.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    testData.orders.forEach((order) => {
      Orders.deleteOrderViaApi(order.id);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    cy.deleteTagApi(testData.tagId, true);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C350739 Verify if trailing spaces in POL search field do NOT affect retrieved results (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C350739'] },
    () => {
      // Step 1: Navigate to Search and filter Order lines pane (Apps > Orders > Order lines)
      Orders.selectOrderLines();
      OrderLines.waitLoading();
      Orders.verifyActiveBtnOrdersFilters(orderLinesButtonName);

      // Step 5: Repeat steps 2-4 for every "Search and filter" drop-down menu option
      testData.searches.forEach(({ name, value, orderLine }) => {
        // Steps 2-3: Select the search option, enter valid data into search field, click "Search"
        // Filter by the unique tag to isolate the test PO line from other PO lines
        OrderLines.filterByTags([testData.orderLineTag]);
        OrderLines.searchByParameter(name, value);
        OrderLines.checkOrderlineSearchResults({
          poLineNumber: orderLine.poLineNumber,
          title: orderLine.titleOrPackage,
        });
        OrderLines.assertResultsCount(1);
        OrderLines.clearAllFilters();
        OrderLines.assertNoFiltersApplied();

        // Step 4: Enter valid data with trailing space into search field, click "Search"
        // Filter by the unique tag to isolate the test PO line from other PO lines
        OrderLines.filterByTags([testData.orderLineTag]);
        OrderLines.searchByParameter(name, `${value} `);
        OrderLines.checkOrderlineSearchResults({
          poLineNumber: orderLine.poLineNumber,
          title: orderLine.titleOrPackage,
        });
        OrderLines.assertResultsCount(1);
        OrderLines.clearAllFilters();
        OrderLines.assertNoFiltersApplied();
      });
    },
  );
});
