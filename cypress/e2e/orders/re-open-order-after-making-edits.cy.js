import { including } from '../../../interactors';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import { TransactionDetails } from '../../support/fragments/finance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderEditForm,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import OrderStates from '../../support/fragments/orders/orderStates';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { Receivings, ReceivingDetails } from '../../support/fragments/receiving';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { Addresses } from '../../support/fragments/settings/tenant/general';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Orders', () => {
  const originalPrice = '10.00';
  const decreasedPrice = '5.00';
  const quantityPhysical = 1;

  const testData = {
    addresses: [Addresses.generateAddressConfig(), Addresses.generateAddressConfig()],
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    order: {},
    orderLine: {},
    user: {},
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      purchaseOrderId,
      cost: {
        listUnitPrice: Number(originalPrice),
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical,
        poLineEstimatedPrice: Number(originalPrice),
      },
      fundDistribution: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: 'percentage',
          value: 100,
        },
      ],
      locations: [
        {
          locationId,
          quantity: quantityPhysical,
          quantityPhysical,
        },
      ],
      checkinItems: false,
      acquisitionMethod: acquisitionMethodId,
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
        materialType: materialTypeId,
        materialSupplier: testData.organization.id,
        volumes: [],
      },
    };
  };

  const createOrderWithLine = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'One-Time',
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
      );

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
            (orderLinesArray) => {
              testData.orderLine = orderLinesArray[0];
            },
          );
        });
      });
    });
  };

  const createFinanceData = () => {
    return FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: fiscalYearResponse.id,
      };

      return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        };

        return Funds.createViaApi(fund).then((fundResponse) => {
          testData.fund = fundResponse.fund;

          const budget = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundResponse.fund.id,
            allocated: 1000,
          };

          return Budgets.createViaApi(budget).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
      exportToAccounting: false,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

      return Locations.getViaApiAnyDefault().then((locations) => {
        return cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
          return cy
            .getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
            })
            .then((acquisitionMethod) => {
              return createOrderWithLine(
                locations[0].id,
                materialType.id,
                acquisitionMethod.body.acquisitionMethods[0].id,
              );
            });
        });
      });
    });
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();

    testData.addresses.forEach((address) => Addresses.createAddressViaApi(address));

    createFinanceData().then(() => {
      createOrderData().then(() => {
        cy.createTempUser([
          permissions.uiFinanceViewFundAndBudget.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.uiOrdersApprovePurchaseOrders.gui,
          permissions.uiOrdersEdit.gui,
          permissions.uiOrdersUnopenpurchaseorders.gui,
          permissions.uiReceivingViewEditCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      InventoryInstances.deleteInstanceByTitleViaApi(testData.orderLine.titleOrPackage);
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      testData.addresses.forEach((address) => Addresses.deleteAddressViaApi(address));
    });
  });

  it(
    'C10934 Re-open order after making edits (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C10934'] },
    () => {
      // A user is on "Orders" pane with search results for created order
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 1: Unopen the purchase order
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        hasRelations: false,
        submit: true,
      });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.order.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Edit purchase order - change "Bill to" and "Ship to" addresses
      OrderDetails.openOrderEditForm();
      OrderEditForm.selectDropDownValue('Bill to', testData.addresses[0].name);
      OrderEditForm.selectDropDownValue('Ship to', testData.addresses[1].name);
      OrderEditForm.clickSaveButton();

      // Verify the order is saved and displays the Bill to and Ship to addresses
      OrderDetails.checkFieldsConditions([
        {
          label: 'Bill to',
          conditions: { value: including(testData.addresses[0].address.split('\n')[0]) },
        },
        {
          label: 'Ship to',
          conditions: { value: including(testData.addresses[1].address.split('\n')[0]) },
        },
      ]);

      // Step 3: Click the PO line record in "PO lines" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);

      // Step 4: Edit the PO line - decrease the price in "Cost details" accordion
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.fillCostDetails({ physicalUnitPrice: '5' });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          currentEncumbrance: '$0.00',
        },
      ]);
      OrderLineDetails.backToOrderDetails();

      // Step 5: Open (re-open) the purchase order
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 6: Click the PO line record and verify updated "Current encumbrance"
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          currentEncumbrance: `$${decreasedPrice}`,
        },
      ]);

      // Step 7: Click "Current encumbrance" link and verify the Encumbrance pane
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: `($${decreasedPrice})` },
          { key: 'Source', value: testData.orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
        ],
      });
      TransactionDetails.closeTransactionDetails();

      // Step 8: Go to "Receiving" app, search for the PO line and open the title
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.searchByParameter({
        parameter: 'Keyword',
        value: testData.orderLine.titleOrPackage,
      });
      Receivings.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(quantityPhysical);
    },
  );
});
