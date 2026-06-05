import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_SEARCH_OPTIONS,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../support/fragments/orders/orderLines';
import OrderStates from '../../support/fragments/orders/orderStates';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    order: {},
    location: {},
    user: {},
    currencyCode: 'GEL',
    initialExchangeRate: 10,
    negativeRate: '-10',
    positiveRate: '20',
    userLimit: 'U2',
  };

  before('Create test data', () => {
    cy.getAdminToken();

    FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
      };

      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        };

        Funds.createViaApi(fund).then((fundResponse) => {
          testData.fund = fundResponse.fund;

          const budget = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundResponse.fund.id,
            allocated: 1000,
          };

          Budgets.createViaApi(budget).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });

    Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationResponse) => {
      testData.organization = { id: organizationResponse };
    });

    ServicePoints.getViaApi().then((servicePoint) => {
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
        (locationResponse) => {
          testData.location = locationResponse;
        },
      );
    });

    cy.then(() => {
      cy.getDefaultMaterialType().then((materialType) => {
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        }).then((params) => {
          const order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
          const orderLine = {
            ...BasicOrderLine.getDefaultOrderLine(),
            orderFormat: 'P/E Mix',
            cost: {
              currency: testData.currencyCode,
              exchangeRate: testData.initialExchangeRate,
              discountType: 'percentage',
              quantityPhysical: 1,
              quantityElectronic: 1,
              listUnitPrice: 10,
              listUnitPriceElectronic: 10,
            },
            details: { subscriptionInterval: 0 },
            eresource: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
              accessProvider: testData.organization.id,
              userLimit: 5,
            },
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: materialType.id,
              materialSupplier: testData.organization.id,
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
                locationId: testData.location.id,
                quantity: 2,
                quantityPhysical: 1,
                quantityElectronic: 1,
              },
            ],
            acquisitionMethod: params.body.acquisitionMethods[0].id,
          };

          Orders.createOrderWithOrderLineViaApi(order, orderLine).then((orderResponse) => {
            testData.order = orderResponse;
          });
        });
      });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteViaApi(testData.budget.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C566117 Edit PO line and set exchange rate to negative (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C566117'] },
    () => {
      // Precondition: open order line details pane
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();

      // Step 1: Click "Actions" -> "Edit"
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.waitLoading();

      // Verify currency, "Use set exchange rate" checked, exchange rate populated with preset value
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'useSetExchangeRate', conditions: { checked: true } },
        {
          label: 'exchangeRate',
          conditions: { value: String(testData.initialExchangeRate) },
        },
      ]);

      // Step 2: Update "User limit" field with alphanumeric value
      OrderLineEditForm.setUserLimit(testData.userLimit);

      // Step 3: Put a negative number in "Set exchange rate" field
      OrderLines.setExchangeRate(testData.negativeRate, { clickCheckbox: false });
      OrderLineEditForm.checkExchangeRateError(OrderStates.exchangeRateAmountMustBePositive, true);

      // Step 4: Click "Save & close" - PO line is NOT saved, page remains opened, warning still shown
      OrderLines.saveOrderLine();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkExchangeRateError(OrderStates.exchangeRateAmountMustBePositive, true);

      // Step 5: Update "Set exchange rate" field with positive number, warning disappears
      OrderLines.setExchangeRate(testData.positiveRate, { clickCheckbox: false });
      OrderLineEditForm.checkExchangeRateError(OrderStates.exchangeRateAmountMustBePositive, false);

      // Step 6: Click "Save & close" - PO line saved, details pane reopened
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          { key: POLINE_DETAILS_FIELDS.CURRENCY, value: testData.currencyCode },
          { key: POLINE_DETAILS_FIELDS.EXCHANGE_RATE, value: testData.positiveRate },
        ],
      });
      OrderLineDetails.checkFieldsConditions([
        { label: POLINE_DETAILS_FIELDS.USER_LIMIT, conditions: { value: testData.userLimit } },
      ]);
    },
  );
});
