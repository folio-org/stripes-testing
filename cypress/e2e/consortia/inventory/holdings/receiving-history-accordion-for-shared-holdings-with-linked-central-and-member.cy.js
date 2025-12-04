import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  LOCATION_NAMES,
  // HOLDINGS_SOURCE_NAMES,
  VENDOR_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
// import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
// import Users from '../../../../support/fragments/users/users';
// import getRandomPostfix from '../../../../support/utils/stringTools';
// import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import Orders from '../../../../support/fragments/orders/orders';
import Organizations from '../../../../support/fragments/organizations/organizations';
import Receiving from '../../../../support/fragments/receiving/receiving';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Holdings', () => {
    describe('Consortia', () => {
      const testData = {};
      const userPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ];
      const centralOrder = {
        order: {},
        orderLine: {},
      };
      // const memberOrder = {
      //   order: {},
      //   orderLine: {
      //     quantity: '1',
      //     price: '10',
      //   },
      // };
      const createOrderLine = (purchaseOrderId, locationId, acquisitionMethodId) => {
        return {
          ...BasicOrderLine.defaultOrderLine,
          id: uuid.v4(),
          // title: testData.instance.instanceTitle,
          instanceId: testData.instance.instanceId,
          purchaseOrderId,
          cost: {
            listUnitPrice: 10.0,
            currency: 'USD',
            discountType: 'percentage',
            quantityPhysical: 1,
            poLineEstimatedPrice: 10.0,
          },
          locations: [
            {
              locationId,
              quantity: 1,
              quantityPhysical: 1,
            },
          ],
          acquisitionMethod: acquisitionMethodId,
          physical: {
            createInventory: 'Instance, Holding',
            volumes: [],
          },
        };
      };
      const createOngoingOrderWithLine = (locationId, acquisitionMethodId) => {
        const order = {
          ...NewOrder.getDefaultOrder({ vendorId: centralOrder.vendorId }),
          orderType: 'Ongoing',
          reEncumber: true,
          ongoing: {
            isSubscription: false,
            manualRenewal: false,
          },
        };

        return Orders.createOrderViaApi(order).then((orderResponse) => {
          centralOrder.order = orderResponse;
          console.log('orderResponse', orderResponse);
          const orderLine = createOrderLine(orderResponse.id, locationId, acquisitionMethodId);

          return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
            console.log('orderLineResponse', orderLineResponse);
            centralOrder.orderLine = orderLineResponse;

            return Orders.updateOrderViaApi({
              ...orderResponse,
              workflowStatus: ORDER_STATUSES.OPEN,
            }).then(() => {
              return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
                (orderLinesArray) => {
                  centralOrder.orderLine = orderLinesArray[0];
                },
              );
            });
          });
        });
      };

      const receivePiece = (orderLineId) => {
        return cy.wait(3000).then(() => {
          return Receiving.getPiecesViaApi(orderLineId).then((pieces) => {
            console.log('pieces', pieces);
            return Receiving.receivePieceViaApi({
              poLineId: orderLineId,
              pieces: [
                {
                  id: pieces[0].id,
                },
              ],
            });
          });
        });
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi()
          .then(({ instanceData }) => {
            testData.instance = instanceData;

            Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
              (organization) => {
                centralOrder.vendorId = organization.id;
              },
            );
            cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
              centralOrder.locationId = res.id;
            });
            cy.getBookMaterialType().then((materialType) => {
              centralOrder.materialTypeId = materialType.id;
            });
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((params) => {
              centralOrder.acquisitionMethodId = params.body.acquisitionMethods[0].id;
            });
          })
          .then(() => {
            centralOrder.order = createOngoingOrderWithLine(
              centralOrder.locationId,
              centralOrder.acquisitionMethodId,
            );
            receivePiece(centralOrder.orderLine.id);
          });
        cy.setTenant(Affiliations.College);
        // // cy.resetTenant();

        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: testData.user.userId,
              permissions: userPermissions,
            });
          });

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      // after('Delete test data', () => {
      //   cy.getAdminToken();
      //   cy.setTenant(Affiliations.University);
      //   cy.deleteHoldingRecordViaApi(testData.holding.id);
      //   Locations.deleteViaApi(testData.location);
      //   cy.withinTenant(Affiliations.Consortia, () => {
      //     cy.getAdminToken();
      //     InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      //     Users.deleteViaApi(testData.user.userId);
      //   });
      // });

      it(
        'C491283 Check Receiving history accordion for shared Holdings with linked central and member tenants (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C491283'] },
        () => {
          console.log('centralOrder', centralOrder);
          console.log('centralOrderLine', centralOrder.orderLine);
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
        },
      );
    });
  });
});
