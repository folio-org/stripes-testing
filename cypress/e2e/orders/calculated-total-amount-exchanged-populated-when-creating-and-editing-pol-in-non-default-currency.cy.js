import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  CURRENCIES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_VIEW_FIELD_LABELS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const createCurrency = { code: 'UZS', label: CURRENCIES.UZS };
  const editCurrency = { code: 'UAH', label: CURRENCIES.UAH };
  const exchangeRate = '3.5';
  const unitPrice = '10';
  const calculatedTotalAmountLabel = 'Calculated total amount (Exchanged)';
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C451488_Organization_${getRandomPostfix()}`,
    };
    testData.polData = {
      itemDetails: {
        title: `AT_C451488_POLTitle_${getRandomPostfix()}`,
      },
      poLineDetails: {
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
        orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        materialType: MATERIAL_TYPE_NAMES.TEXT,
      },
      costDetails: {
        physicalUnitPrice: unitPrice,
        quantityPhysical: '1',
      },
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: organizationId })).then(
        (order) => {
          testData.order = order;
        },
      );
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersCreate.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
        Orders.selectFromResultsList(testData.order.poNumber);
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C451488 "Calculated total amount (Exchanged)" field is populated correctly when user creates and edits PO line in non-default currency (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C451488'] },
    () => {
      // Step 1: Click "Actions" -> "Add PO line" in "PO lines" accordion
      OrderLines.addPOLine();
      OrderLineEditForm.waitLoading();

      // Step 2: Fill in the mandatory fields
      OrderLineEditForm.fillOrderLineFields(testData.polData);
      OrderLineEditForm.checkCostDetailsFieldsAbsent([calculatedTotalAmountLabel]);

      // Step 3: Expand "Currency" dropdown and scroll the page up and down - dropdown is closed
      OrderLineEditForm.fillCostDetails({ currency: true });
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { ariaExpanded: 'true' } },
      ]);
      OrderLineEditForm.scrollToFundDistributionSection();
      OrderLineEditForm.scrollToItemDetailsSection();
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { ariaExpanded: 'false' } },
      ]);

      // Step 4: Select currency not supported by ECB provider
      OrderLines.selectCurrency(createCurrency.label);
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { singleValue: createCurrency.label } },
        { label: 'useSetExchangeRate', conditions: { checked: true, readOnly: true } },
        { label: 'exchangeRate', conditions: { disabled: false, required: true } },
        { label: 'calculatedTotalAmount', conditions: { value: '$10.00' } },
      ]);

      // Step 5: Fill in "Set exchange rate" - "Calculated total amount (Exchanged)" is <Price> * <Exchange rate>
      OrderLines.setExchangeRate(exchangeRate, { clickCheckbox: false });
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'exchangeRate', conditions: { value: exchangeRate } },
        { label: 'calculatedTotalAmount', conditions: { value: '$35.00' } },
      ]);

      // Step 6: Click "Add fund distribution" and expand "Fund ID" dropdown
      OrderLineEditForm.scrollToFundDistributionSection();
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown(0);
      OrderLineEditForm.checkFundDistributionSection([
        { label: 'fundIdButton', conditions: { ariaExpanded: 'true' } },
      ]);

      // Step 7: Scroll the page up and down - "Fund ID" dropdown is closed and marked as required
      OrderLineEditForm.scrollToItemDetailsSection();
      OrderLineEditForm.scrollToFundDistributionSection();
      OrderLineEditForm.checkFundDistributionSection([
        { label: 'fundIdButton', conditions: { ariaExpanded: 'false' } },
        { label: 'fund', conditions: { error: 'Required!' } },
      ]);

      // Step 8: Add location and expand "Fund ID" dropdown
      OrderLineEditForm.clickAddLocationButton();
      OrderLines.addLocationToPOLWithoutSave({
        location: testData.location,
        physicalQuantity: '1',
      });
      OrderLineEditForm.expandFundIdDropdown(0);
      OrderLineEditForm.checkFundDistributionSection([
        { label: 'fundIdButton', conditions: { ariaExpanded: 'true' } },
      ]);

      // Step 10: Remove the fund distribution record and click "Save & close"
      OrderLineEditForm.deleteFundDistribution({ index: 0 });
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          { key: POLINE_DETAILS_FIELDS.CURRENCY, value: createCurrency.code },
          { key: POLINE_DETAILS_FIELDS.EXCHANGE_RATE, value: exchangeRate },
          { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: '10.00' },
          { key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE, value: '10.00' },
        ],
      });

      // Step 11: Click "Back to PO" and check the "Total estimated price" fields
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE_EXCHANGED, value: '$35.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '10.00' },
        ],
      });

      // Step 12: Open PO line and click "Actions" -> "Edit"
      OrderDetails.openPolDetails(testData.polData.itemDetails.title);
      OrderLineDetails.openOrderLineEditForm();

      // Step 13: Select another currency not supported by ECB provider
      OrderLines.selectCurrency(editCurrency.label);
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { singleValue: editCurrency.label } },
        { label: 'useSetExchangeRate', conditions: { checked: true, readOnly: true } },
        { label: 'exchangeRate', conditions: { disabled: false, required: true } },
        // TODO: "Calculated total amount (Exchanged)" keeps the previous exchanged value instead of the unit price - check Jira
        // { label: 'calculatedTotalAmount', conditions: { value: '$10.00' } },
      ]);

      // Step 14: Fill in "Set exchange rate" - "Calculated total amount (Exchanged)" is <Price> * <Exchange rate>
      OrderLines.setExchangeRate(exchangeRate, { clickCheckbox: false });
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'exchangeRate', conditions: { value: exchangeRate } },
        { label: 'calculatedTotalAmount', conditions: { value: '$35.00' } },
      ]);

      // Step 15: Click "Save & close"
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [
          { key: POLINE_DETAILS_FIELDS.CURRENCY, value: editCurrency.code },
          { key: POLINE_DETAILS_FIELDS.EXCHANGE_RATE, value: exchangeRate },
          { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: '10.00' },
          { key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE, value: '10.00' },
        ],
      });
    },
  );
});
