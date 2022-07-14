import uuid from 'uuid';
import NewOrder from '../../support/fragments/orders/newOrder';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';
import getRandomPostfix from '../../support/utils/stringTools';

// TODO:  Rebuild the test after fixing the problem with orderLineNumber definition in its scope.
// TODO: Check the search using the second POLINE,to have a working search on empty env.
describe('orders: Test Po line search', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = {
    ...basicOrderLine.defaultOrderLine,
    details: {
      productIds: [{
        productId: '9781868885015',
        productIdType: '8261054f-be78-422d-bd51-4ed9f33c3422'
      }],
      subscriptionInterval: 0
    },
    donor: `Autotest donor_${getRandomPostfix()}`,
    publisher: `Autotest Publishing_${getRandomPostfix()}`,
    requester: `Autotest requester_${getRandomPostfix()}`,
    selector: `Autotest selector_${getRandomPostfix()}`,
    fundDistribution: [],
    physical: {
      createInventory: 'Instance, Holding, Item',
      materialType: '',
      materialSupplier: '',
      volumes: ['test vol. 1']
    },
    vendorDetail: {
      instructions: `autotest instructions_${getRandomPostfix()}`,
      noteFromVendor: `autotest note_${getRandomPostfix()}`,
      referenceNumbers: [
        {
          refNumber: '123456-78',
          refNumberType: 'Vendor title number',
          vendorDetailsSource: 'OrderLine'
        }
      ],
      vendorAccount: '8910-10'
    },
    contributors: [{
      contributor: `Autotest Contributor_${getRandomPostfix()}`,
      contributorNameTypeId: uuid()
    }],
  };
  let orderLineNumber;
  const searchers = [
    { nameOfSearch: 'Keyword', valueOfLine: orderLine.titleOrPackage },
    { nameOfSearch: 'Contributor', valueOfLine: orderLine.contributors[0].contributor },
    { nameOfSearch: 'Requester', valueOfLine: orderLine.requester },
    { nameOfSearch: 'Title or package name', valueOfLine: orderLine.titleOrPackage },
    { nameOfSearch: 'Publisher', valueOfLine: orderLine.publisher },
    { nameOfSearch: 'Vendor account', valueOfLine: orderLine.vendorDetail.vendorAccount },
    { nameOfSearch: 'Vendor reference number', valueOfLine: orderLine.vendorDetail.referenceNumbers[0].refNumber },
    { nameOfSearch: 'Donor', valueOfLine: orderLine.donor },
    { nameOfSearch: 'Selector', valueOfLine: orderLine.selector },
    { nameOfSearch: 'Volumes', valueOfLine: orderLine.physical.volumes },
    { nameOfSearch: 'Product ID', valueOfLine: orderLine.details.productIds[0].productId },
    { nameOfSearch: 'Product ID ISBN', valueOfLine: orderLine.details.productIds[0].productId },
  ];

  before(() => {
    cy.getAdminToken();
    cy.getOrganizationApi({ query: 'name="Amazon.com"' })
      .then(organization => {
        order.vendor = organization.id;
        orderLine.physical.materialSupplier = organization.id;
        orderLine.eresource.accessProvider = organization.id;
      });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` })
      .then(location => { orderLine.locations[0].locationId = location.id; });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => { orderLine.physical.materialType = materialType.id; });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.createOrderApi(order)
      .then(() => {
        cy.getAcquisitionMethodsApi({ query: 'value="Other"' })
          .then((params) => {
            orderLine.acquisitionMethod = params.body.acquisitionMethods[0].id;
            orderLine.purchaseOrderId = order.id;
            cy.createOrderLineApi(orderLine)
              .then((response) => {
                orderLineNumber = response.body.poLineNumber;
              });
            cy.visit(TopMenu.ordersPath);
            Orders.selectOrderLines();
          });
      });
  });

  after(() => {
    Orders.deleteOrderApi(order.id);
  });

  searchers.forEach((searcher) => {
    it('C6719 Test the POL searches', { tags: [TestType.smoke] }, () => {
      Orders.searchByParameter(searcher.nameOfSearch, searcher.valueOfLine);
      Orders.checkOrderlineSearchResults(orderLineNumber);
      Orders.resetFilters();
    });
  });

  // TODO: add extra TC in testrail about it
  it('C6719 Test the POL searches(Only test POL name search) (thunderjet)', { tags: [TestType.smoke] }, () => {
    Orders.searchByParameter('PO line number', orderLineNumber);
    Orders.checkOrderlineSearchResults(orderLineNumber);
    Orders.resetFilters();
  });
});
