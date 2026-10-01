import {
  APPLICATION_NAMES,
  INVOICE_LINE_VIEW_FIELDS,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testCaseId = 'C466146';
  const QUANTITY = 1;
  let testData;

  const createOrderWithOrderLine = ({ title, instanceId, locations }) => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    ).then((order) => {
      const orderLine = {
        ...BasicOrderLine.getDefaultOrderLine({
          title,
          instanceId,
          purchaseOrderId: order.id,
          acquisitionMethod: testData.acquisitionMethod.id,
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          quantity: QUANTITY,
          specialLocationId: testData.location.id,
          specialMaterialTypeId: testData.materialType.id,
          vendorAccount: testData.organization.accounts[0].accountNo,
        }),
        locations,
      };

      return OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => ({
        order,
        orderLine: createdOrderLine,
      }));
    });
  };

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      servicePoint: ServicePoints.getDefaultServicePoint(),
      instanceTitle: `AT_${testCaseId}_FolioInstance_${getRandomPostfix()}`,
      secondOrderLineTitle: `AT_${testCaseId}_OrderLine_${getRandomPostfix()}`,
    };
    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
      testData.materialType = mtypes[0];
    });
    cy.getAcquisitionMethodsApi().then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    // Precondition 1: Location exists
    ServicePoints.createViaApi(testData.servicePoint).then(() => {
      const { location, campus, institution, library } = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      });

      testData.location = location;
      testData.locationRelations = {
        libraryId: library.id,
        campusId: campus.id,
        institutionId: institution.id,
      };
      testData.locationHierarchy = {
        institution: institution.name,
        campus: campus.name,
        library: library.name,
        location: location.name,
      };
      Locations.createViaApi(location);
    });

    // Precondition 2: Instance with Holdings in the location from precondition 1
    cy.then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: holdingTypes[0].id,
                permanentLocationId: testData.location.id,
              },
            ],
          }).then((instanceData) => {
            testData.instanceId = instanceData.instanceId;
            testData.holdingId = instanceData.holdings[0].id;
          });
        });
      });
    });

    // Precondition 3: Order #1 with POL linked to the Instance from precondition 2
    cy.then(() => {
      createOrderWithOrderLine({
        title: testData.instanceTitle,
        instanceId: testData.instanceId,
        locations: [
          { holdingId: testData.holdingId, quantity: QUANTITY, quantityPhysical: QUANTITY },
        ],
      }).then(({ order, orderLine }) => {
        testData.firstOrder = order;
        testData.firstOrderLine = orderLine;
      });
    });

    // Precondition 4: Order #2 with POL not linked to Instance, location from precondition 1
    cy.then(() => {
      createOrderWithOrderLine({
        title: testData.secondOrderLineTitle,
        locations: [
          { locationId: testData.location.id, quantity: QUANTITY, quantityPhysical: QUANTITY },
        ],
      }).then(({ order, orderLine }) => {
        testData.secondOrder = order;
        testData.secondOrderLine = orderLine;
      });
    });

    // Precondition 5: Open Invoice without invoice lines for the same vendor
    cy.then(() => {
      Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
      }).then((invoice) => {
        testData.invoice = invoice;
      });
    });

    // Preconditions 6-7: User is logged in and on "Order lines" pane of "Orders" app
    cy.createTempUser([
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.orderLinesPath,
        waiter: OrderLines.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    OrderLines.getOrderLineByIdViaApi(testData.secondOrderLine.id).then((orderLine) => {
      Orders.deleteOrderViaApi(testData.firstOrder.id, false);
      Orders.deleteOrderViaApi(testData.secondOrder.id, false);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);

      if (orderLine.instanceId) {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(orderLine.instanceId);
      }
    });
    Locations.deleteViaApi({ id: testData.location.id, ...testData.locationRelations });
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C466146 Order line with linked Holdings could be found by "Location" filtering facet when creating invoice line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466146'] },
    () => {
      const firstPolNumber = testData.firstOrderLine.poLineNumber;
      const secondPolNumber = testData.secondOrderLine.poLineNumber;

      // Step 1: Click "Reset all" button on "Search & filter" pane
      OrderLines.resetFiltersIfActive();
      OrderLines.assertNoFiltersApplied();

      // Steps 2-4: Expand "Location" facet, click "Location look-up", select location and click "Save"
      OrderLines.selectLocationInFilters(testData.location.name);
      OrderLines.assertResultsCount(2);
      OrderLines.checkExistingPOLInOrderLinesList(firstPolNumber);
      OrderLines.checkExistingPOLInOrderLinesList(secondPolNumber);

      // Step 5: Open "Order #1"
      OrderLines.selectOrders();
      Orders.searchByParameter('PO number', testData.firstOrder.poNumber);
      Orders.selectFromResultsList(testData.firstOrder.poNumber);
      Orders.openOrder();
      Orders.checkOrderStatus(ORDER_STATUSES.OPEN);
      Orders.closeThirdPane();

      // Step 6: Open "Order #2"
      Orders.searchByParameter('PO number', testData.secondOrder.poNumber);
      Orders.selectFromResultsList(testData.secondOrder.poNumber);
      Orders.openOrder();
      Orders.checkOrderStatus(ORDER_STATUSES.OPEN);
      Orders.closeThirdPane();

      // Step 7: Click "Order lines" toggle, "Reset all" and filter by location from precondition 1
      Orders.selectOrderLines();
      OrderLines.resetFilters();
      OrderLines.assertNoFiltersApplied();
      OrderLines.selectLocationInFilters(testData.location.name);
      OrderLines.checkExistingPOLInOrderLinesList(firstPolNumber);
      OrderLines.checkExistingPOLInOrderLinesList(secondPolNumber);
      OrderLines.assertResultsCount(2);

      // Step 8: Navigate to "Invoices" app, open Invoice and select "Add line from POL"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      Invoices.openPolSearchPlugin();
      SelectOrderLinesModal.verifyModalView();
      SelectOrderLinesModal.assertResetAllButtonState({ disabled: true });
      SelectOrderLinesModal.checkChooseFilterMessageDisplayed();

      // Step 9: Expand "Location" accordion and click "Location look-up" link
      SelectOrderLinesModal.openLocationLookUp();

      // Step 10: Select location from precondition 1
      SelectLocationModal.searchLocation(testData.location.name);

      // Step 11: Click "X" button on "Select locations" modal
      SelectLocationModal.closeModal();
      SelectOrderLinesModal.verifyModalView();
      SelectOrderLinesModal.assertResetAllButtonState({ disabled: true });
      SelectOrderLinesModal.checkChooseFilterMessageDisplayed();
      SelectOrderLinesModal.checkTotalSelected(0);

      // Step 12: Click "Location look-up" link
      SelectOrderLinesModal.openLocationLookUp();

      // Step 13: Select "Institution" -> "Campus" -> "Library" -> "Location" from precondition 1
      SelectLocationModal.selectLocationByHierarchy(testData.locationHierarchy);

      // Step 14: Click "Save" button
      SelectOrderLinesModal.assertSearchResults([firstPolNumber, secondPolNumber]);

      // Step 15: Select "POL #1" and click "Save" button
      SelectOrderLinesModal.selectOrderLineByNumber(firstPolNumber);
      SelectOrderLinesModal.clickSaveButton();
      InvoiceView.checkInvoiceLinesTableContent([
        { poNumber: firstPolNumber, description: testData.instanceTitle },
      ]);

      // Step 16: Select "New blank line" option in "Invoice lines" accordion
      Invoices.createInvoiceLineNewBlankLine();
      InvoiceLineEditForm.waitLoading();

      // Step 17: Click "POL look-up" link
      InvoiceLineEditForm.clickPolLookUpButton();
      SelectOrderLinesModal.verifyModalView({ multiselect: false });
      SelectOrderLinesModal.assertResetAllButtonState({ disabled: true });
      SelectOrderLinesModal.checkChooseFilterMessageDisplayed();

      // Step 18: Expand "Location" accordion and click "Location look-up" link
      SelectOrderLinesModal.openLocationLookUp();

      // Step 19: Select location from precondition 1
      SelectLocationModal.selectLocation(testData.location.name, { multiselect: true });

      // Step 20: Click "Save" button
      SelectOrderLinesModal.assertSearchResults([firstPolNumber, secondPolNumber]);

      // Step 21: Select "POL #2" by clicking on it
      SelectOrderLinesModal.selectOrderLineByNumber(secondPolNumber, { multiselect: false });
      InvoiceLineEditForm.checkFieldsConditions([
        { label: 'POL number', conditions: { value: secondPolNumber } },
        {
          label: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION,
          conditions: { value: testData.secondOrderLineTitle },
        },
      ]);

      // Step 22: Click "Save & close" button
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkInvoiceLinesTableContent([
        { poNumber: firstPolNumber, description: testData.instanceTitle },
        { poNumber: secondPolNumber, description: testData.secondOrderLineTitle },
      ]);
    },
  );
});
