import uuid from 'uuid';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import OrderLines from '../../support/fragments/orders/orderLines';

describe('orders: Test Po line filters', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const today = new Date();
  const subcriptionDate = DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY');
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = {
    ...BasicOrderLine.defaultOrderLine,
    details: {
      productIds: [
        {
          productId: '9781868885015',
          productIdType: uuid(),
        },
      ],
      subscriptionFrom: `${DateTools.getFormattedDate(
        { date: today },
        'YYYY-MM-DD',
      )}T00:00:00.000+00:00`,
      subscriptionInterval: 0,
    },
    donor: `Autotest donor_${getRandomPostfix()}`,
    publisher: `Autotest Publishing_${getRandomPostfix()}`,
    requester: `Autotest requester_${getRandomPostfix()}`,
    selector: `Autotest selector_${getRandomPostfix()}`,
    fundDistribution: [
      {
        code: 'USHIST',
        fundId: '',
        distributionType: 'percentage',
        value: 100,
      },
    ],
    physical: {
      createInventory: 'Instance, Holding, Item',
      materialType: '',
      materialSupplier: '',
      volumes: ['test vol. 1'],
    },
    vendorDetail: {
      instructions: `autotest instructions_${getRandomPostfix()}`,
      noteFromVendor: `autotest note_${getRandomPostfix()}`,
      referenceNumbers: [
        {
          refNumber: '123456-78',
          refNumberType: 'Vendor title number',
          vendorDetailsSource: 'OrderLine',
        },
      ],
      vendorAccount: '8910-10',
    },
  };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  let orderLineNumber;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
      orderLine.physical.materialSupplier = response;
      orderLine.eresource.accessProvider = response;
    });
    invoice.vendorName = organization.name;
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` }).then((location) => {
      orderLine.locations[0].locationId = location.id;
    });
    cy.getBookMaterialType().then((materialType) => {
      orderLine.physical.materialType = materialType.id;
    });
    cy.getFundsApi({ query: 'code="USHIST"' }).then((funds) => {
      orderLine.fundDistribution[0].fundId = funds[0]?.id;
      cy.getAdminToken();
      cy.createOrderApi(order).then(() => {
        cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then((params) => {
          orderLine.acquisitionMethod = params.body.acquisitionMethods[0].id;
          orderLine.purchaseOrderId = order.id;
          cy.createOrderLineApi(orderLine).then((response) => {
            orderLineNumber = response.body.poLineNumber;
          });
        });
      });
      cy.waitForAuthRefresh(() => {
        cy.loginAsAdmin();
        cy.visit(TopMenu.ordersPath);
      });
      Orders.selectOrderLines();
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  [
    { filterActions: Orders.selectFilterMainLibraryLocationsPOL },
    { filterActions: Orders.selectFilterFundCodeUSHISTPOL },
    { filterActions: Orders.selectFilterOrderFormatPhysicalResourcePOL },
    {
      filterActions: () => {
        Orders.selectFilterVendorPOL(invoice);
      },
    },
    {
      filterActions: () => {
        Orders.selectFilterSubscriptionFromPOL(subcriptionDate);
      },
    },
    { filterActions: Orders.selectFilterNoInRushPOL },
  ].forEach((filter) => {
    it(
      'C6720 Test the POL filters [except tags] (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'C6720'] },
      () => {
        Orders.searchByParameter('PO line number', orderLineNumber);
        Orders.resetFilters();
        filter.filterActions();
        OrderLines.varifyOrderlineInResultsList(orderLineNumber);
        Orders.resetFilters();
      },
    );
  });
});
