import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Consortium (Orders)', () => {
    const testData = {
      sharedInstance: {},
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };

    before('Create user, data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then((response) => {
        testData.sharedInstance = response.instanceData;

        cy.getInstanceHRID(response.instanceData.instanceId).then((hrid) => {
          testData.instanceHRID = hrid;
        });

        cy.setTenant(Affiliations.College);
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
          (locationResp) => {
            Organizations.createOrganizationViaApi(testData.organization).then(() => {
              cy.getBookMaterialType().then((mtypeResp) => {
                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                }).then((auResp) => {
                  testData.order = NewOrder.getDefaultOngoingOrder({
                    vendorId: testData.organization.id,
                  });
                  const orderLine = {
                    ...BasicOrderLine.defaultOrderLine,
                    titleOrPackage: testData.sharedInstance.instanceTitle,
                    instanceId: testData.sharedInstance.instanceId,
                    cost: {
                      listUnitPrice: 10.0,
                      currency: 'USD',
                      discountType: 'percentage',
                      quantityPhysical: 1,
                      poLineEstimatedPrice: 10.0,
                    },
                    acquisitionMethod: auResp.body.acquisitionMethods[0].id,
                    locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                    physical: {
                      createInventory: 'Instance, Holding, Item',
                      materialType: mtypeResp.id,
                      volumes: [],
                    },
                  };

                  Orders.createOrderViaApi(testData.order).then((orderResponse) => {
                    testData.order = orderResponse;
                    orderLine.purchaseOrderId = orderResponse.id;

                    OrderLines.createOrderLineViaApi(orderLine);
                    Orders.updateOrderViaApi({
                      ...orderResponse,
                      workflowStatus: ORDER_STATUSES.OPEN,
                    });
                  });
                });
              });
            });
          },
        );
      });
      cy.resetTenant();

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.userProperties = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersEdit.gui,
          Permissions.uiReceivingViewEditCreate.gui,
        ]);
        cy.resetTenant();

        cy.login(testData.userProperties.username, testData.userProperties.password);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
      });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(testData.sharedInstance.instanceId);
      cy.setTenant(Affiliations.College);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });

    it(
      'C411742 Receiving for shared instance in member tenant (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C411742'] },
      () => {
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectFromResultsList(testData.order.poNumber);
        Orders.receiveOrderViaActions();
        Receiving.selectFromResultsList(testData.sharedInstance.instanceTitle);
        Receiving.selectPieceByIndexInExpected();
        Receiving.quickReceiveInEditPieceModal();
        Receiving.selectInstanceInReceive();
        InventoryInstance.checkInstanceTitle(testData.sharedInstance.instanceTitle);
        InventoryInstance.checkInstanceHrId(testData.instanceHRID);
      },
    );
  });
});
