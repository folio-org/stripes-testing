import {
  APPLICATION_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Receivings } from '../../support/fragments/receiving';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testCaseId = 'C580277';
  const QUANTITY = 1;
  let testData;

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      servicePoint: ServicePoints.getDefaultServicePoint(),
      instanceTitle: `AT_${testCaseId}_FolioInstance_${getRandomPostfix()}`,
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

    // Initial location used on POL and new permanent location used on Holdings later
    ServicePoints.createViaApi(testData.servicePoint).then(() => {
      const initial = Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id });
      testData.initialLocation = initial.location;
      testData.initialLocationRelations = {
        libraryId: initial.library.id,
        campusId: initial.campus.id,
        institutionId: initial.institution.id,
      };
      Locations.createViaApi(initial.location);

      const permanent = Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id });
      testData.newLocation = permanent.location;
      testData.newLocationRelations = {
        libraryId: permanent.library.id,
        campusId: permanent.campus.id,
        institutionId: permanent.institution.id,
      };
      Locations.createViaApi(permanent.location);
    });

    // Instance with Holdings in the initial location
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
                permanentLocationId: testData.initialLocation.id,
              },
            ],
          }).then((instanceData) => {
            testData.instanceId = instanceData.instanceId;
            testData.holdingId = instanceData.holdings[0].id;
          });
        });
      });
    });

    // Precondition 1: Open Order with one synchronized PO Line linked to the Holdings
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        const orderLine = {
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.instanceTitle,
            instanceId: testData.instanceId,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            checkinItems: false,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
            quantity: QUANTITY,
            specialLocationId: testData.initialLocation.id,
            specialMaterialTypeId: testData.materialType.id,
            vendorAccount: testData.organization.accounts[0].accountNo,
          }),
          locations: [
            { holdingId: testData.holdingId, quantity: QUANTITY, quantityPhysical: QUANTITY },
          ],
        };

        OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
          testData.orderLine = createdOrderLine;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Precondition 2: Change "Permanent location" of the Holdings related to the POL
    cy.then(() => {
      cy.getHoldings({ limit: 1, query: `"instanceId"=="${testData.instanceId}"` }).then(
        (holdings) => {
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            permanentLocationId: testData.newLocation.id,
          });
        },
      );
    });

    // Precondition 3: Open Invoice without invoice lines for the same vendor
    cy.then(() => {
      Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
      }).then((invoice) => {
        testData.invoice = invoice;
      });
    });

    // Precondition 4: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingView.gui,
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
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    Locations.deleteViaApi({
      id: testData.initialLocation.id,
      ...testData.initialLocationRelations,
    });
    Locations.deleteViaApi({ id: testData.newLocation.id, ...testData.newLocationRelations });
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C580277 Synchronized order line with linked Holdings could be found by "Location" filtering facet when permanent location was changed in "Inventory" app (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C580277'] },
    () => {
      const polNumber = testData.orderLine.poLineNumber;

      // Step 1: Go to "Orders" app, select "Order lines" toggle, click "Reset all" button
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrderLines();
      OrderLines.resetFiltersIfActive();
      OrderLines.assertNoFiltersApplied();

      // Steps 2-3: Expand "Location" accordion, click "Location look-up", select new location, "Save"
      OrderLines.selectLocationInFilters(testData.newLocation.name);
      OrderLines.checkExistingPOLInOrderLinesList(polNumber);

      // Step 4: Go to "Receiving" app, click "Reset all" button
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.waitLoading();
      Receivings.clearAllFilters();

      // Steps 5-6: Expand "Location" accordion, click "Location look-up", select new location, "Save"
      Receivings.selectLocationInFilters(testData.newLocation.name);
      Receivings.assertReceivingResults([testData.instanceTitle]);

      // Step 7: Click on title from Preconditions record
      const ReceivingDetails = Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 8: Click on the record in "Expected" accordion
      const EditPieceModal = ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.verifySelectedHolding(testData.newLocation.name);

      // Step 9: Navigate to "Invoices" app, open Invoice and select "Add line from POL" option
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
      Invoices.selectInvoiceByNumber(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      Invoices.openPolSearchPlugin();
      SelectOrderLinesModal.verifyModalView();
      SelectOrderLinesModal.assertResetAllButtonState({ disabled: true });
      SelectOrderLinesModal.checkChooseFilterMessageDisplayed();

      // Step 10: Expand "Location" accordion and click "Location look-up" link
      SelectOrderLinesModal.openLocationLookUp();

      // Step 11: Select new permanent location and click "Save" button
      SelectLocationModal.selectLocation(testData.newLocation.name, { multiselect: true });
      SelectOrderLinesModal.assertSearchResults([polNumber]);
    },
  );
});
