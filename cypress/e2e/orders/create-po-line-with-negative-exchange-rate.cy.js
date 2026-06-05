import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
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
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {
    organization: {},
    order: {},
    location: {},
    user: {},
    currency: 'Georgian Lari (GEL)',
    selectedCurrencyCode: 'GEL',
    negativeRate: '-5',
    positiveRate: '3',
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

    cy.createTempUser([Permissions.uiOrdersCreate.gui]).then((userProperties) => {
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
      OrderLineEditForm.setUserLimit(testData.userLimit);

      // Step 3: Select unsupported ECB currency (e.g. GEL).
      OrderLines.selectCurrency(testData.currency);
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'useSetExchangeRate', conditions: { checked: true } },
        { label: 'exchangeRate', conditions: { disabled: false } },
      ]);

      // Step 4: Put a negative number into "Set exchange rate" field
      OrderLines.setExchangeRate(testData.negativeRate, { clickCheckbox: false });
      OrderLineEditForm.checkExchangeRateError(OrderStates.exchangeRateAmountMustBePositive, true);

      // Step 5: Fill remaining required fields (location) and try to save
      OrderLineEditForm.clickAddLocationButton();
      OrderLines.addLocationToPOLWithoutSave({
        location: testData.location,
        electronicQuantity: '1',
      });
      OrderLines.saveOrderLine();

      // PO line is NOT saved, "Add PO line" page remains opened, warning is still present
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkExchangeRateError(OrderStates.exchangeRateAmountMustBePositive, true);

      // Step 6: Put a positive number into "Set exchange rate" field
      OrderLines.setExchangeRate(testData.positiveRate, { clickCheckbox: false });
      OrderLineEditForm.checkExchangeRateError(OrderStates.exchangeRateAmountMustBePositive, false);

      // Step 7: Click "Save & close" - PO line is saved
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });

      // Verify newly created PO line details pane is opened with expected values
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          { key: POLINE_DETAILS_FIELDS.CURRENCY, value: testData.selectedCurrencyCode },
          { key: POLINE_DETAILS_FIELDS.EXCHANGE_RATE, value: testData.positiveRate },
        ],
      });
      OrderLineDetails.checkFieldsConditions([
        { label: POLINE_DETAILS_FIELDS.USER_LIMIT, conditions: { value: testData.userLimit } },
      ]);
    },
  );
});
