import CapabilitySets from '../../../support/dictionary/capabilitySets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  CURRENCIES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_TEMPLATE_FORM_ACCORDION_LABELS,
  ORDER_TYPES,
  ORDER_VIEW_FIELD_LABELS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_SELECTED,
} from '../../../support/constants';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderEditForm from '../../../support/fragments/orders/orderEditForm';
import OrderLineDetails from '../../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import OrderTemplateForm from '../../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const VENDOR_CLAIMING_INTERVAL = 5;
const TEMPLATE_CLAIMING_INTERVAL = '10';
const QUANTITY_PHYSICAL = '1';
const UNIT_PRICE = '10';
// "hiddenFields.*" names of the eye icons in the order template form
const HIDDEN_FIELDS = {
  CLAIMING_ACTIVE: 'claimingActive',
  CLAIMING_INTERVAL: 'claimingInterval',
  DONOR_INFORMATION: 'donorsInformation',
};

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let testData;

    before('Create test data', () => {
      const postfix = getRandomPostfix();

      testData = {
        vendor: {
          ...NewOrganization.getDefaultOrganization({
            claimingInterval: VENDOR_CLAIMING_INTERVAL,
          }),
          name: `AT_C466160_Vendor_${postfix}`,
        },
        donors: [1, 2].map((donorNumber) => ({
          ...NewOrganization.getDefaultOrganization({ isDonor: true, isVendor: false }),
          name: `AT_C466160_Donor_${donorNumber}_${postfix}`,
        })),
        ledger: {
          ...Ledgers.getDefaultLedger(),
          name: `AT_C466160_Ledger_${postfix}`,
        },
        fund: {
          ...Funds.getDefaultFund(),
          name: `AT_C466160_Fund_${postfix}`,
        },
        templateName: `AT_C466160_OrderTemplate_${postfix}`,
        orderLineTitle: `AT_C466160_OrderLine_${postfix}`,
        poNumbers: [],
      };

      cy.getAdminToken();
      Locations.getViaApiAnyDefault(1)
        .then(([location]) => {
          testData.location = location;

          Organizations.createOrganizationViaApi(testData.vendor);
          testData.donors.forEach((donor) => Organizations.createOrganizationViaApi(donor));
        })
        .then(() => FiscalYears.getCurrentFiscalYearOrCreateViaApi())
        .then((fiscalYear) => {
          Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
        })
        .then(() => {
          // Fund with one donor, restricted to one location
          Funds.createViaApi({
            ...testData.fund,
            ledgerId: testData.ledger.id,
            donorOrganizationIds: [testData.donors[0].id],
            restrictByLocations: true,
            locations: [{ locationId: testData.location.id }],
          });
        })
        .then(() => {
          cy.createTempUser([]).then((userProperties) => {
            testData.user = userProperties;

            cy.assignCapabilitiesToExistingUser(
              testData.user.userId,
              [],
              [
                CapabilitySets.uiOrdersOrdersCreate,
                CapabilitySets.uiOrdersSettingsOrderTemplatesCreate,
              ],
            );

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsOrdersPath,
              waiter: Orders.waitSettingsPageLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.poNumbers.forEach((poNumber) => Orders.deleteOrderByOrderNumberViaApi(poNumber));
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.orderLineTitle);
      OrderTemplates.getOrderTemplateByNameViaApi(testData.templateName).then((template) => {
        if (template) {
          OrderTemplates.deleteOrderTemplateViaApi(template.id);
        }
      });
      Funds.deleteFundViaApi(testData.fund.id, false);
      Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
      Organizations.deleteOrganizationViaApi(testData.vendor.id);
      testData.donors.forEach((donor) => Organizations.deleteOrganizationViaApi(donor.id));
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C466160 Receiving status, Claiming interval, Donor information fields are populated in POL from the order template (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C466160'] },
      () => {
        // Step 1: Go to "Order templates" and click "New"
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
        OrderTemplates.clickNewOrderTemplateButton();
        OrderTemplateForm.assertInfoSectionFields({ templateName: '' });

        // Step 2: Fill "Template name", select vendor via "Organization look-up"
        OrderTemplateForm.fillOrderTemplateFields({
          templateInformation: { templateName: testData.templateName },
          poInformation: { organizationName: testData.vendor.name },
        });
        OrderTemplateForm.assertInfoSectionFields({ templateName: testData.templateName });
        OrderTemplateForm.checkPoInfoSectionFields([
          { label: 'vendor', conditions: { value: testData.vendor.name } },
        ]);

        // Step 3: Select "Receipt not required" in "Receipt status"
        OrderTemplateForm.fillOrderTemplateFields({
          poLineDetails: { receiptStatus: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
        });
        OrderTemplateForm.checkPoLineDetailsFields([
          {
            label: 'receiptStatus',
            conditions: { checkedOptionText: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
          },
        ]);

        // Step 4: Check "Claiming active" and fill "Claiming interval"
        OrderLines.claimingActiveAndSetInterval(TEMPLATE_CLAIMING_INTERVAL);
        OrderTemplateForm.checkPoLineDetailsFields([
          { label: 'claimingActive', conditions: { checked: true } },
          { label: 'claimingInterval', conditions: { value: TEMPLATE_CLAIMING_INTERVAL } },
        ]);

        // Step 5: Add fund distribution with the fund from preconditions
        OrderTemplateForm.expandAccordion(ORDER_TEMPLATE_FORM_ACCORDION_LABELS.FUND_DISTRIBUTION);
        OrderTemplateForm.clickAddFundDistributionButton();
        OrderTemplateForm.selectFundDistribution({
          fundName: testData.fund.name,
          fundCode: testData.fund.code,
        });
        OrderTemplateForm.verifyFundDistributionSelected({ fundCode: testData.fund.code });

        // Step 6: Add location that matches the fund restriction
        OrderTemplateForm.expandAccordion(ORDER_TEMPLATE_FORM_ACCORDION_LABELS.LOCATION);
        OrderTemplateForm.clickAddLocationButton();
        OrderTemplateForm.expandLocationNameCodeDropdown();
        OrderTemplateForm.selectLocationFromDropdown(testData.location.name);
        OrderTemplateForm.verifyLocationSelected({ location: testData.location.name });

        // Step 7: Click "Save"
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 8: Click on created order template record
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.expandAll();
        OrderTemplates.checkTemplateViewDetails({
          fields: [
            { key: ORDER_VIEW_FIELD_LABELS.VENDOR, value: testData.vendor.name },
            {
              key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
              value: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED,
            },
            {
              key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE,
              value: { checked: true, disabled: true },
              checkbox: true,
            },
            { key: POLINE_DETAILS_FIELDS.CLAIMING_INTERVAL, value: TEMPLATE_CLAIMING_INTERVAL },
          ],
          fundDistribution: [testData.fund.code],
        });
        OrderLines.checkDonorInformation([testData.donors[0].name], { exactCount: true });
        OrderTemplates.checkFundRestrictionErrorToastAbsent();

        // Step 9: Create an order from the template
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.clickCreateNewOrder();
        OrderEditForm.selectOrderTemplate(testData.templateName);
        OrderEditForm.verifySelectedOrderTemplate(testData.templateName);
        // Wait until the template is applied (vendor comes from it), otherwise it resets "Order type"
        OrderEditForm.verifyOrderInformationSection([
          { label: 'vendor', conditions: { value: testData.vendor.name } },
        ]);
        OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
        OrderEditForm.verifyOrderInformationSection([
          { label: 'orderType', conditions: { value: ORDER_TYPES.ONE_TIME_API } },
        ]);
        OrderEditForm.clickSaveButton();

        // Step 10: Click "Actions" in "PO lines" accordion and select "Add PO line"
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.checkTemplateName(testData.templateName);
        OrderLineEditForm.checkOrderLineDetailsSection([
          {
            label: 'receiptStatus',
            conditions: { checkedOptionText: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
          },
          { label: 'claimingActive', conditions: { checked: true } },
          { label: 'claimingInterval', conditions: { value: TEMPLATE_CLAIMING_INTERVAL } },
        ]);
        OrderLineEditForm.assertFundDistributionFund({
          fundName: testData.fund.name,
          fundCode: testData.fund.code,
        });

        // Step 11: Expand "Donor information" accordion
        OrderLines.openDonorInformationSection();
        OrderLines.checkDonorInformation([testData.donors[0].name], {
          exactCount: true,
          editable: true,
        });
        OrderLines.checkAddDonorButtomisActive();

        // Step 12: Fill all mandatory fields and click "Save & close"
        OrderLineEditForm.fillOrderLineFields({
          itemDetails: { title: testData.orderLineTitle },
          poLineDetails: {
            acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
            materialType: MATERIAL_TYPE_NAMES.BOOK,
          },
          costDetails: { physicalUnitPrice: UNIT_PRICE, quantityPhysical: QUANTITY_PHYSICAL },
          locationDetails: [{ quantityPhysical: QUANTITY_PHYSICAL }],
        });
        OrderLines.selectCurrency(CURRENCIES.USD);
        OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
        OrderLineDetails.checkOrderLineDetails({
          poLineInformation: [
            {
              key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
              value: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED,
            },
            {
              key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE,
              value: { checked: true, disabled: true },
              checkbox: true,
            },
            { key: POLINE_DETAILS_FIELDS.CLAIMING_INTERVAL, value: TEMPLATE_CLAIMING_INTERVAL },
          ],
        });
        OrderLines.checkDonorInformation([testData.donors[0].name], { exactCount: true });
        OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.code }]);
        OrderLines.getAssignedPOLNumber().then((polNumber) => {
          testData.poNumbers.push(polNumber.split('-')[0]);
        });

        // Step 13: Open the template in edit mode
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        OrderTemplates.goToTemplatesFromOrders();
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.openEditForm();
        OrderTemplateForm.verifyFormButtons({ saveDisabled: true });

        // Step 14: Click "X" icon
        OrderTemplateForm.closeForm();
        OrderTemplates.waitLoading();

        // Step 15: Open the template in edit mode again
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.openEditForm();
        OrderTemplateForm.verifyFormButtons({ saveDisabled: true });

        // Step 16: Add the second donor in "Donor information" accordion
        OrderTemplateForm.expandAccordion(ORDER_TEMPLATE_FORM_ACCORDION_LABELS.DONOR_INFORMATION);
        OrderLines.addDonor(testData.donors[1].name);
        OrderLines.checkDonorInformation(
          testData.donors.map(({ name }) => name),
          {
            exactCount: true,
          },
        );

        // Step 17: Click "Save"
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 18: Create an order from the template
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        // Orders app reopens the previous PO line: go back to the order, close it and reset filters
        OrderLineDetails.backToOrderDetails();
        OrderDetails.closeOrderDetails();
        Orders.resetFilters();
        Orders.clickCreateNewOrder();
        OrderEditForm.selectOrderTemplate(testData.templateName);
        OrderEditForm.verifySelectedOrderTemplate(testData.templateName);
        OrderEditForm.verifyOrderInformationSection([
          { label: 'vendor', conditions: { value: testData.vendor.name } },
        ]);
        OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
        OrderEditForm.verifyOrderInformationSection([
          { label: 'orderType', conditions: { value: ORDER_TYPES.ONE_TIME_API } },
        ]);
        OrderEditForm.clickSaveButton();

        // Step 19: Click "Actions" in "PO lines" accordion and select "Add PO line"
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.checkTemplateName(testData.templateName);
        OrderLineEditForm.checkOrderLineDetailsSection([
          {
            label: 'receiptStatus',
            conditions: { checkedOptionText: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
          },
          { label: 'claimingActive', conditions: { checked: true } },
          { label: 'claimingInterval', conditions: { value: TEMPLATE_CLAIMING_INTERVAL } },
        ]);
        OrderLines.openDonorInformationSection();
        OrderLines.checkDonorInformation(
          testData.donors.map(({ name }) => name),
          {
            exactCount: true,
          },
        );
        OrderLineEditForm.assertFundDistributionFund({
          fundName: testData.fund.name,
          fundCode: testData.fund.code,
        });

        // Step 20: Fill all mandatory fields and click "Save & close"
        OrderLineEditForm.fillOrderLineFields({
          itemDetails: { title: testData.orderLineTitle },
          poLineDetails: {
            acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
            materialType: MATERIAL_TYPE_NAMES.BOOK,
          },
          costDetails: { physicalUnitPrice: UNIT_PRICE, quantityPhysical: QUANTITY_PHYSICAL },
          locationDetails: [{ quantityPhysical: QUANTITY_PHYSICAL }],
        });
        OrderLines.selectCurrency(CURRENCIES.USD);
        OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
        OrderLineDetails.checkOrderLineDetails({
          poLineInformation: [
            {
              key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
              value: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED,
            },
            {
              key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE,
              value: { checked: true, disabled: true },
              checkbox: true,
            },
            { key: POLINE_DETAILS_FIELDS.CLAIMING_INTERVAL, value: TEMPLATE_CLAIMING_INTERVAL },
          ],
        });
        OrderLines.checkDonorInformation(
          testData.donors.map(({ name }) => name),
          {
            exactCount: true,
          },
        );
        OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.code }]);
        OrderLines.getAssignedPOLNumber().then((polNumber) => {
          testData.poNumbers.push(polNumber.split('-')[0]);
        });

        // Step 21: Open the template in edit mode
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        OrderTemplates.goToTemplatesFromOrders();
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.openEditForm();

        // Step 22: Click eye icons next to "Claiming active", "Claiming interval", "Donor information"
        Object.values(HIDDEN_FIELDS).forEach((fieldName) => {
          OrderTemplateForm.toggleFieldVisibilityIcon(fieldName);
          OrderTemplateForm.verifyFieldVisibilityControl(fieldName, { hidden: true });
        });

        // Step 23: Click "Save"
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 24: Create an order from the template
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        OrderLineDetails.backToOrderDetails();
        OrderDetails.closeOrderDetails();
        Orders.resetFilters();
        Orders.clickCreateNewOrder();
        OrderEditForm.selectOrderTemplate(testData.templateName);
        OrderEditForm.verifySelectedOrderTemplate(testData.templateName);
        OrderEditForm.verifyOrderInformationSection([
          { label: 'vendor', conditions: { value: testData.vendor.name } },
        ]);
        OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
        OrderEditForm.verifyOrderInformationSection([
          { label: 'orderType', conditions: { value: ORDER_TYPES.ONE_TIME_API } },
        ]);
        OrderEditForm.clickSaveButton();

        // Step 25: Click "Actions" in "PO lines" accordion and select "Add PO line"
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.checkTemplateName(testData.templateName);
        OrderLineEditForm.checkOrderLineDetailsSection([
          {
            label: 'receiptStatus',
            conditions: { checkedOptionText: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
          },
          { label: 'claimingActive', absent: true },
          { label: 'claimingInterval', absent: true },
        ]);
        OrderLines.checkDonorInformation([], { visible: false });
        OrderLineEditForm.assertFundDistributionFund({
          fundName: testData.fund.name,
          fundCode: testData.fund.code,
        });

        // Fill all mandatory fields and click "Save & close"
        OrderLineEditForm.fillOrderLineFields({
          itemDetails: { title: testData.orderLineTitle },
          poLineDetails: {
            acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
            materialType: MATERIAL_TYPE_NAMES.BOOK,
          },
          costDetails: { physicalUnitPrice: UNIT_PRICE, quantityPhysical: QUANTITY_PHYSICAL },
          locationDetails: [{ quantityPhysical: QUANTITY_PHYSICAL }],
        });
        OrderLines.selectCurrency(CURRENCIES.USD);
        OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
        OrderLineDetails.checkOrderLineDetails({
          poLineInformation: [
            {
              key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
              value: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED,
            },
            { key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE, absent: true },
            { key: POLINE_DETAILS_FIELDS.CLAIMING_INTERVAL, absent: true },
          ],
        });
        OrderLines.checkDonorInformation([], { visible: false });
        OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fund.code }]);
        OrderLines.getAssignedPOLNumber().then((polNumber) => {
          testData.poNumbers.push(polNumber.split('-')[0]);
        });
      },
    );
  });
});
