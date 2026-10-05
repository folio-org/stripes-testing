import uuid from 'uuid';

import {
  COMMON_BUTTON_LABELS,
  ORDER_FORMAT_VALUES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import AcqVersionHistory from '../../support/fragments/acqVersionHistory';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
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
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import { Addresses } from '../../support/fragments/settings/tenant/general';
import AddressesConfig from '../../support/fragments/settings/tenant/addressesConfig';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  // Preconditions 2-4: minimal records count, so the last values by name are NOT from the first 10
  const minAddressesCount = 12;
  const minLibraryLocationsCount = 11;
  const minMaterialTypesCount = 11;
  const sortByName = (records) => [...records].sort((a, b) => a.name.localeCompare(b.name));
  const testData = {};

  before('Create test data', () => {
    testData.title = `AT_C380735_POLTitle_${getRandomPostfix()}`;
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C380735_Organization_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    // Preconditions 2-4: create missing records, values NOT from the first 10 (the last ones by name) are used for editing
    AddressesConfig.getAddressesViaApi({ limit: 1000 }).then((addresses) => {
      testData.createdAddresses = [...Array(Math.max(minAddressesCount - addresses.length, 0))].map(
        (_, index) => Addresses.generateAddressConfig({
          name: `AT_C380735_Address_${index}_${getRandomPostfix()}`,
          address: `AT_C380735_AddressValue_${index}_${getRandomPostfix()}`,
        }),
      );
      testData.createdAddresses.forEach((address) => Addresses.createAddressViaApi(address));
      [testData.shipToAddress, testData.billToAddress] = sortByName([
        ...addresses,
        ...testData.createdAddresses,
      ]).slice(-2);
    });
    Locations.getViaApiAnyDefault(1000).then((locations) => {
      [testData.orderLocation] = sortByName(locations);

      const { institutionId, campusId, libraryId, servicePointIds, primaryServicePoint } =
        testData.orderLocation;
      const libraryLocations = locations.filter((location) => location.libraryId === libraryId);

      testData.createdLocations = [
        ...Array(Math.max(minLibraryLocationsCount - libraryLocations.length, 0)),
      ].map((_, index) => ({
        id: uuid(),
        code: `AT_C380735_${index}_${getRandomPostfix()}`,
        name: `AT_C380735_Location_${index}_${getRandomPostfix()}`,
        isActive: true,
        institutionId,
        campusId,
        libraryId,
        servicePointIds,
        primaryServicePoint,
      }));
      testData.createdLocations.forEach((location) => Locations.createViaApi(location));
      testData.newLocation = sortByName([...libraryLocations, ...testData.createdLocations]).pop();
    });
    MaterialTypes.getMaterialTypesViaApi({ limit: 1000 }).then(({ mtypes }) => {
      testData.createdMaterialTypes = [
        ...Array(Math.max(minMaterialTypesCount - mtypes.length, 0)),
      ].map((_, index) => ({
        ...MaterialTypes.getDefaultMaterialType(),
        name: `AT_C380735_MaterialType_${index}_${getRandomPostfix()}`,
      }));
      testData.createdMaterialTypes.forEach((materialType) => {
        MaterialTypes.createMaterialTypeViaApi(materialType);
      });

      const sortedMaterialTypes = sortByName([...mtypes, ...testData.createdMaterialTypes]);

      [testData.orderMaterialType] = sortedMaterialTypes;
      [testData.newElectronicMaterialType, testData.newPhysicalMaterialType] =
        sortedMaterialTypes.slice(-2);
    });
    Organizations.createOrganizationViaApi(testData.organization);

    // Precondition 1: "Pending" order with "P/E Mix" PO line, title is selected from look-up
    cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
      InventoryInstances.createFolioInstanceViaApi({
        instance: { instanceTypeId: instanceTypes[0].id, title: testData.title },
      }).then(({ instanceId }) => {
        testData.instanceId = instanceId;
      });
    });
    cy.then(() => {
      Orders.createOrderWithOrderLineViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        {
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.title,
            instanceId: testData.instanceId,
          }),
          orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
          cost: {
            currency: 'USD',
            listUnitPrice: 1,
            listUnitPriceElectronic: 1,
            quantityPhysical: 1,
            quantityElectronic: 1,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.orderMaterialType.id,
          },
          eresource: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
            materialType: testData.orderMaterialType.id,
            accessProvider: testData.organization.id,
          },
          locations: [
            { locationId: testData.orderLocation.id, quantityPhysical: 1, quantityElectronic: 1 },
          ],
        },
      ).then((order) => {
        testData.order = order;
      });
    });
    cy.get('@orderLine').then((orderLine) => {
      testData.orderLine = orderLine;
    });

    // Precondition 5: user with "Orders: Can edit Orders and Order lines" permission
    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    testData.createdAddresses.forEach((address) => Addresses.deleteAddressViaApi(address));
    testData.createdLocations.forEach(({ id }) => Locations.deleteLocationViaApi(id));
    testData.createdMaterialTypes.forEach(({ id }) => MaterialTypes.deleteViaApi(id));
  });

  it(
    'C380735 Changed "Bill to", "Ship to", "Name (code)" and "Material type" fields are displayed correctly in "Version history" for purchase order and lines (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C380735'] },
    () => {
      cy.intercept('GET', `/audit-data/acquisition/order/${testData.order.id}*`).as(
        'orderVersionHistory',
      );
      cy.intercept('GET', `/audit-data/acquisition/order-line/${testData.orderLine.id}*`).as(
        'orderLineVersionHistory',
      );

      // Steps 1-3: two addresses NOT from the first 10 are taken via API in preconditions (instead of DevTools)
      // Step 4: Open the Order - workflow status is "Pending"
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderDetails({
        summary: [{ key: ORDER_VIEW_FIELD_LABELS.WORKFLOW_STATUS, value: ORDER_STATUSES.PENDING }],
      });

      // Step 5: "Actions" -> "Edit" - "Save & close" button is NOT active
      OrderDetails.openOrderEditForm();
      OrderEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 6: Select noted addresses in "Bill to" and "Ship to" dropdowns
      OrderEditForm.selectDropDownValue(
        ORDER_VIEW_FIELD_LABELS.BILL_TO,
        testData.billToAddress.name,
      );
      OrderEditForm.selectDropDownValue(
        ORDER_VIEW_FIELD_LABELS.SHIP_TO,
        testData.shipToAddress.name,
      );
      OrderEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 7: Click "Save & close" - changes are saved
      OrderEditForm.clickSaveButton();
      OrderDetails.checkOrderDetails({
        orderInformation: [
          { key: ORDER_VIEW_FIELD_LABELS.BILL_TO, value: testData.billToAddress.address },
          { key: ORDER_VIEW_FIELD_LABELS.SHIP_TO, value: testData.shipToAddress.address },
        ],
      });

      // Step 8: Click "Version history" icon - changed fields contain selected values, no special field names
      Orders.openVersionHistory();
      cy.wait('@orderVersionHistory');
      AcqVersionHistory.assertVersionHistoryCard('order', {
        index: 0,
        isCurrent: true,
        changedFields: [ORDER_VIEW_FIELD_LABELS.BILL_TO, ORDER_VIEW_FIELD_LABELS.SHIP_TO],
      });
      // only "Bill to" and "Ship to" are listed, no other (e.g. special) field names
      AcqVersionHistory.checkChangedFieldsCountInCard('order', { index: 0, count: 2 });
      Orders.checkHighlightedFieldsInVersionView([
        testData.billToAddress.address,
        testData.shipToAddress.address,
      ]);

      // Step 9: Open PO line, "Actions" -> "Edit"
      Orders.closeVersionHistory();
      OrderDetails.openPolDetails(testData.title);
      OrderLineDetails.openOrderLineEditForm();

      // Step 10: Remove values in "Location" accordion
      OrderLineEditForm.removeLocationByIndex(0);
      OrderLineEditForm.checkLocationsSectionIsEmpty();

      // Step 11: Click "Add location" and "Create new holdings for location" - "Select locations" popup appears
      OrderLines.openCreateHoldingForLocation();

      // Step 12: Select location NOT from the first 10
      SelectLocationModal.selectLocation(testData.newLocation.name);
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1', quantityElectronic: '1' }]);

      // Step 13: Select material types NOT from the first 10 for physical and electronic resources
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: {
          materialType: testData.newPhysicalMaterialType.name,
          eresourceMaterialType: testData.newElectronicMaterialType.name,
        },
      });
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 14: Click "Save & close" - changes are saved
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        physicalResourceDetails: [
          {
            key: POLINE_DETAILS_FIELDS.MATERIAL_TYPE,
            value: testData.newPhysicalMaterialType.name,
          },
        ],
      });
      OrderLineDetails.checkLocationsSection({
        locations: [
          [{ key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.newLocation.name }],
        ],
      });

      // Step 15: Click "Version history" icon - changed fields contain selected values, no special field names
      OrderLineDetails.openVersionHistory();
      cy.wait('@orderLineVersionHistory');
      AcqVersionHistory.assertVersionHistoryCard('order-line', {
        index: 0,
        isCurrent: true,
        changedFields: [POLINE_DETAILS_FIELDS.LOCATION_NAME, POLINE_DETAILS_FIELDS.MATERIAL_TYPE],
      });
      // only "Name (code)" and "Material type" are listed, no other (e.g. special) field names
      AcqVersionHistory.checkChangedFieldsCountInCard('order-line', { index: 0, count: 2 });
      OrderLineDetails.checkHighlightedFieldsInVersionHistoryView([
        testData.newLocation.name,
        testData.newPhysicalMaterialType.name,
        testData.newElectronicMaterialType.name,
      ]);
    },
  );
});
