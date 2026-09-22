import {
  APPLICATION_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_FORMAT_VALUES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { orderLineFields } from '../../support/fragments/orders/orderLineEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    polTitle: `AT_C468202_PEMixPOLine_${getRandomPostfix()}`,
    order: {},
    user: {},
  };

  before(() => {
    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    Locations.getViaApiAnyDefault().then((locations) => {
      const location = locations[0];

      cy.getBookMaterialType().then((mtypeResp) => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: organization.id });
        testData.orderLine = {
          ...BasicOrderLine.getDefaultOrderLine(),
          titleOrPackage: testData.polTitle,
          checkinItems: true,
          details: {
            productIds: [],
            subscriptionInterval: 0,
            isBinderyActive: true,
          },
          cost: {
            currency: 'USD',
            discountType: 'percentage',
            quantityPhysical: 1,
            quantityElectronic: 1,
            listUnitPriceElectronic: 10,
            listUnitPrice: 10,
          },
          orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
          eresource: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
            accessProvider: organization.id,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: mtypeResp.id,
          },
          locations: [
            {
              locationId: location.id,
              quantityPhysical: 1,
              quantityElectronic: 1,
            },
          ],
        };

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
          (orderResponse) => {
            testData.order = orderResponse;
          },
        );
      });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C468202 Set "Bindery active" flag false and change Order format from "P/E Mix" to "Other" in existing POL (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C468202'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);

      // Step 1: Click on PO line record in "PO lines" accordion
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();

      // Step 2: Click on "Actions" button -> select "Edit" option
      OrderLines.editPOLInOrder();
      OrderLineEditForm.waitLoading();

      // Step 3: Click on "Order format" dropdown to expand it
      OrderLineEditForm.checkSelectOptions(orderLineFields.orderFormat, [
        ' ',
        ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        ORDER_FORMAT_NAMES.PE_MIX,
      ]);

      // Step 4: Uncheck the "Bindery active" checkbox
      OrderLineEditForm.clickBinderyActiveCheckbox();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false } },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: false,
          },
        },
      ]);

      // Step 5: Scroll down to "Physical resource details" accordion
      OrderLineEditForm.checkPhysicalResourceDetailsSection([
        { label: 'createInventory', conditions: { disabled: false } },
      ]);

      // Step 6: Scroll up to "PO line details" accordion and expand "Order format" dropdown
      OrderLineEditForm.checkSelectOptions(orderLineFields.orderFormat, [
        ' ',
        ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE,
        ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        ORDER_FORMAT_NAMES.PE_MIX,
        ORDER_FORMAT_NAMES.OTHER,
      ]);

      // Step 7: Pick "Other" option from "Order format" dropdown
      OrderLineEditForm.fillPoLineDetails({ orderFormat: ORDER_FORMAT_NAMES.OTHER });
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false, disabled: true } },
      ]);

      // Step 8: Set "Receiving workflow" to "Synchronized order and receipt quantity"
      OrderLineEditForm.fillPoLineDetails({
        receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      });
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
          },
        },
      ]);

      // Step 9: Fill in the required fields and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        costDetails: { physicalUnitPrice: '10', quantityPhysical: '1' },
      });
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1', quantityElectronic: '0' }]);
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });

      // Step 10: Check the "Purchase order line" accordion on POL details pane
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.BINDERY_ACTIVE,
            value: { checked: false, disabled: true },
            checkbox: true,
          },
          {
            key: POLINE_DETAILS_FIELDS.RECEIVING_WORKFLOW,
            value: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
          },
          {
            key: POLINE_DETAILS_FIELDS.ORDER_FORMAT,
            value: ORDER_FORMAT_NAMES.OTHER,
          },
        ],
      });
    },
  );
});
