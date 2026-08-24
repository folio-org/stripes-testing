import uuid from 'uuid';
import { ORDER_LINE_FILTER_LABELS, POL_CREATE_INVENTORY_SETTINGS } from '../../support/constants';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { PaneRequestWaiter } from '../../support/utils';
import {
  PANE_REQUEST_PHASES,
  PANE_REQUEST_PROFILE_NAMES,
} from '../../support/utils/paneRequestWaiter';

const { FUND_CODE, LOCATION, ORDER_FORMAT, RUSH, SUBSCRIPTION_FROM, VENDOR } =
  ORDER_LINE_FILTER_LABELS;

describe('Orders', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const today = new Date();
  const subscriptionDate = DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY');
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
    rush: true,
    fundDistribution: [
      {
        code: 'USHIST',
        fundId: '',
        distributionType: 'percentage',
        value: 100,
      },
    ],
    physical: {
      createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
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
    cy.clearLocalStorage();
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
      cy.loginAsAdmin();
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
      cy.visit(TopMenu.ordersPath);
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C6720 Test the POL filters [except tags] (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C6720'] },
    () => {
      const CASES = [
        {
          name: LOCATION,
          filterActions: () => OrderLines.selectLocationInFilters(OrdersHelper.mainLibraryLocation),
        },
        {
          name: FUND_CODE,
          filterActions: () => OrderLines.filterByFundCodes([orderLine.fundDistribution[0].code]),
        },
        {
          name: ORDER_FORMAT,
          filterActions: () => OrderLines.filterByOrderFormats([BasicOrderLine.defaultOrderLine.orderFormat]),
        },
        {
          name: VENDOR,
          filterActions: () => OrderLines.filterByVendor(invoice.vendorName),
        },
        {
          name: SUBSCRIPTION_FROM,
          filterActions: () => OrderLines.filterBySubscriptionFrom({ from: subscriptionDate, to: subscriptionDate }),
        },
        {
          name: RUSH,
          filterActions: () => OrderLines.filterByRush(['Yes']),
        },
      ];

      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => {
          Orders.selectOrderLines();
          OrderLines.waitLoading();
        },
      });

      cy.wrap(CASES).each(({ name, filterActions }) => {
        cy.log(`<--- FILTER: ${name} --->`);
        OrderLines.clearAllFilters();
        PaneRequestWaiter.waitForPaneRequests({
          pane: PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
          trigger: () => filterActions(),
        });
        OrderLines.assertResetAllButtonState({ disabled: false });
        OrderLines.verifyOrderLineInResultsList(orderLineNumber);
      });

      OrderLines.clearAllFilters();
    },
  );
});
