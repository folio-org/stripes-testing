import {
  ACQUISITION_METHOD_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm, {
  orderLineFields,
} from '../../support/fragments/orders/orderLineEditForm';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const order = {
    ...NewOrder.getDefaultOngoingOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const polData = {
    itemDetails: {
      title: `AT_C468200_PEMixPOLine_${getRandomPostfix()}`,
    },
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES.DEPOSITORY,
      materialType: MATERIAL_TYPE_NAMES.BOOK,
    },
    costDetails: {
      physicalUnitPrice: '10',
      quantityPhysical: '1',
      electronicUnitPrice: '10',
      quantityElectronic: '1',
    },
  };
  let user;
  let orderNumber;
  let location;

  before(() => {
    cy.clearLocalStorage();
    cy.getAdminToken();
    Locations.getViaApiAnyDefault().then((locations) => {
      location = locations[0];
      Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
        organization.id = responseOrganizations;
        order.vendor = organization.id;
        Orders.createOrderViaApi(order).then((orderResponse) => {
          order.id = orderResponse.id;
          orderNumber = orderResponse.poNumber;
        });
      });
    });

    cy.createTempUser([permissions.uiOrdersEdit.gui, permissions.uiOrdersCreate.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C468200 Set "Bindery active" flag true when creating a POL with Order format = "P/E Mix" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C468200'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);

      // Step 1: On "PO lines" accordion click "Actions" -> "Add PO line"
      Orders.createPOLineViaActions();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false } },
      ]);

      // Step 2: Scroll down to "PO line details" accordion and check "Bindery active" checkbox
      OrderLineEditForm.clickBinderyActiveCheckbox();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: true } },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: true,
          },
        },
      ]);

      // Step 3: Click on "Order format" dropdown to expand it
      OrderLineEditForm.checkSelectOptions(orderLineFields.orderFormat, [
        ' ',
        ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        ORDER_FORMAT_NAMES.PE_MIX,
      ]);

      // Step 4: Pick "P/E mix" option from "Order format" dropdown
      OrderLineEditForm.fillPoLineDetails({ orderFormat: ORDER_FORMAT_NAMES.PE_MIX });

      // Step 5: Scroll down to "Physical resource details" accordion
      OrderLineEditForm.checkPhysicalResourceDetailsSection([
        {
          label: 'createInventory',
          conditions: {
            checkedOptionText: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
            disabled: true,
          },
        },
      ]);

      // Step 6: Fill in remaining required fields and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields(polData);
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(location.name);
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1', quantityElectronic: '1' }]);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });

      // Step 7: Check the "Purchase order line" accordion on POL details pane
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.BINDERY_ACTIVE,
            value: { checked: true, disabled: true },
            checkbox: true,
          },
          {
            key: POLINE_DETAILS_FIELDS.ORDER_FORMAT,
            value: ORDER_FORMAT_NAMES.PE_MIX,
          },
          {
            key: POLINE_DETAILS_FIELDS.RECEIVING_WORKFLOW,
            value: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
          },
        ],
        physicalResourceDetails: [
          {
            key: POLINE_DETAILS_FIELDS.CREATE_INVENTORY,
            value: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
          },
        ],
      });
    },
  );
});
