import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  RECEIVING_TITLE_SEARCH_INDEX_LABELS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {};

  before(() => {
    testData.instanceTitle = `AT_C359217_Folio/Instance_${getRandomPostfix()}`;
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C359217_Organization_${getRandomPostfix()}`,
    };
    testData.acquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
      name: `AT_C359217_AcquisitionUnit_${getRandomPostfix()}`,
      protectRead: true,
      protectUpdate: true,
      protectCreate: true,
      protectDelete: true,
    });

    cy.clearLocalStorage();
    cy.getAdminToken();
    AcquisitionUnits.createAcquisitionUnitViaApi(testData.acquisitionUnit);
    // User B: admin user with all permissions, included in the same acquisition unit as User A
    cy.getAdminUserDetails().then((admin) => {
      AcquisitionUnits.assignUserViaApi(admin.id, testData.acquisitionUnit.id).then(
        (membershipId) => {
          testData.adminMembershipId = membershipId;
        },
      );
    });
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body }) => {
      testData.acquisitionMethodId = body.acquisitionMethods[0].id;
    });
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;

      Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: organizationId }),
        acqUnitIds: [testData.acquisitionUnit.id],
      }).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            title: testData.instanceTitle,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethodId,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
        ).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });
        });
      });
    });

    // User A
    cy.createTempUser([Permissions.uiOrdersView.gui, Permissions.uiReceivingView.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        AcquisitionUnits.assignUserViaApi(userProperties.userId, testData.acquisitionUnit.id);

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.receivingPath,
          waiter: Receiving.waitLoading,
        });
      },
    );
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
    AcquisitionUnits.unAssignUserViaApi(testData.adminMembershipId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id, false);
  });

  it(
    'C359217 A user can not see titles in search results that are assigned to acquisition unit to which a user does not belong any more (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C359217'] },
    () => {
      // Step 1: User A goes to "Receiving" app and enters PO line title name in "Search" field
      // Step 2: User A clicks "Search" button
      Receiving.searchByParameter({
        parameter: RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD,
        value: testData.instanceTitle,
      });
      Receiving.checkTitleInReceivingList(testData.instanceTitle);

      // Step 3: User A clicks title from PO line name and expands "Title information" accordion
      Receiving.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.verifyAcquisitionUnitInTitleInformation(testData.acquisitionUnit.name);

      // Step 4: User B is logged in and goes to "Settings" app -> "Acquisition unit" section
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });

      // Step 5: User B selects Acquisition unit from Preconditions #2 in "Acquisition units" pane
      AcquisitionUnits.selectAU(testData.acquisitionUnit.name);
      AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.user.username);

      // Step 6: User B removes User A name from "Assigned users" accordion
      AcquisitionUnits.unAssignUser(testData.user.username, testData.acquisitionUnit.name);

      // Step 7: User A is logged in and goes to "Receiving" app
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.waitLoading,
      });

      // Step 8: User A is searching for title specified in Order from Preconditions #3
      Receiving.searchByParameter({
        parameter: RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD,
        value: testData.instanceTitle,
      });
      Receiving.assertReceivingResults();

      // Step 9: User A goes to "Orders" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();

      // Step 10: User A is searching for Order from Preconditions #3
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.assertNoResultsFound(testData.order.poNumber);
    },
  );
});
