import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

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
    currency: 'Georgian Lari (GEL)',
    selectedCurrencyCode: 'GEL',
    negativeRate: '-5',
    positiveRate: '3',
    warningMessage: 'Amount must be a positive number',
    userLimit: 'unlimited',
  };

  const polData = {
    itemDetails: {
      title: `autotest_pol_title_${getRandomPostfix()}`,
    },
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
      orderFormat: ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE,
      materialType: MATERIAL_TYPE_NAMES.BOOK,
    },
    costDetails: {
      electronicUnitPrice: '10',
      quantityElectronic: '1',
    },
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

      // Order without PO lines
      const order = {
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        approved: true,
        reEncumber: true,
      };

      Orders.createOrderViaApi(order).then((orderResponse) => {
        testData.order = orderResponse;
      });
    });

    ServicePoints.getViaApi().then((servicePoint) => {
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
        (locationResponse) => {
          testData.location = locationResponse;
        },
      );
    });

    cy.createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrdersEdit.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteViaApi(testData.budget.id);
      Funds.deleteFundViaApi(testData.fund.id);
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
        testData.location.institutionId,
        testData.location.campusId,
        testData.location.libraryId,
        testData.location.id,
      );
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C566115 Create PO Line with negative exchange rate (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C566115'] },
    () => {
      // Precondition: open the order without PO lines
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);

      // Step 1: Click "Actions" -> "Add PO line"
      OrderLines.addPOLine();

      // Step 2: Fill required PO line fields (Electronic resource format)
      OrderLineEditForm.fillOrderLineFields(polData);
      cy.get('[name="eresource.userLimit"]').type(testData.userLimit);

      // Step 3: Select unsupported ECB currency (e.g. GEL).
      OrderLines.selectCurrency(testData.currency);
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'useSetExchangeRate', conditions: { checked: true } },
        { label: 'exchangeRate', conditions: { disabled: false } },
      ]);

      // Step 4: Put a negative number into "Set exchange rate" field
      OrderLineEditForm.setExchangeRateValue(testData.negativeRate);
      OrderLineEditForm.checkExchangeRateError(testData.warningMessage, true);

      // Step 5: Fill remaining required fields (fund distribution, location) and try to save
      OrderLines.addFundToPOLWithoutSave(0, testData.fund, '100');
      OrderLineEditForm.clickAddLocationButton();
      OrderLines.addLocationToPOLWithoutSave({
        location: testData.location,
        electronicQuantity: '1',
      });
      OrderLines.saveOrderLine();

      // PO line is NOT saved, "Add PO line" page remains opened, warning is still present
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkExchangeRateError(testData.warningMessage, true);

      // Step 6: Put a positive number into "Set exchange rate" field
      OrderLineEditForm.setExchangeRateValue(testData.positiveRate);
      OrderLineEditForm.checkExchangeRateError(testData.warningMessage, false);

      // Step 7: Click "Save & close" - PO line is saved
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });

      // Verify newly created PO line details pane is opened with expected values
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          { key: 'Currency', value: testData.selectedCurrencyCode },
          { key: 'Exchange rate', value: testData.positiveRate },
        ],
      });
      OrderLineDetails.checkFieldsConditions([
        { label: 'User limit', conditions: { value: testData.userLimit } },
      ]);
    },
  );
});
