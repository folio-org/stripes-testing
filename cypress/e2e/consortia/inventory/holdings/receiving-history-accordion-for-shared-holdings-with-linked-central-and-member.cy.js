import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import Organizations from '../../../../support/fragments/organizations/organizations';
import Receiving from '../../../../support/fragments/receiving/receiving';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';

describe('Inventory', () => {
  describe('Holdings', () => {
    describe('Consortia', () => {
      const testData = {
        holdings: {},
        instance: {},
        user: {},
      };
      const userPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ];
      const centralData = {
        order: {},
        orderLine: {},
        piece: {},
      };
      const memberData = {
        order: {},
        orderLine: {},
        piece: {},
      };
      // create order for central tenant
      const createOrderLineOnCentral = (purchaseOrderId, vendorId, acquisitionMethodId) => {
        return {
          ...BasicOrderLine.defaultOrderLine,
          purchaseOrderId,
          source: 'User',
          claimingActive: false,
          claimingInterval: 45,
          cost: {
            currency: 'USD',
            discountType: 'percentage',
            discount: 10,
            listUnitPrice: 10,
            quantityPhysical: 1,
          },
          physical: {
            createInventory: 'Instance, Holding',
            materialSupplier: vendorId,
          },
          locations: [
            {
              tenantId: 'college',
              holdingId: testData.holdings.holdingId,
              quantityPhysical: 1,
            },
          ],
          isPackage: false,
          checkinItems: false,
          suppressInstanceFromDiscovery: false,
          instanceId: testData.instance.instanceId,
          titleOrPackage: testData.instance.instanceTitle,
          acquisitionMethod: acquisitionMethodId,
          orderFormat: 'Physical Resource',
        };
      };
      const createOrderWithLineOnCentral = (vendorId, acquisitionMethodId) => {
        const order = {
          ...NewOrder.getDefaultOrder({ vendorId }),
          orderType: 'One-Time',
          reEncumber: true,
          approved: true,
        };

        return Orders.createOrderViaApi(order).then((orderResponse) => {
          centralData.order.id = orderResponse.id;
          const orderLine = createOrderLineOnCentral(
            orderResponse.id,
            orderResponse.vendorId,
            acquisitionMethodId,
          );

          return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
            centralData.orderLine = orderLineResponse;

            return Orders.updateOrderViaApi({
              ...orderResponse,
              workflowStatus: ORDER_STATUSES.OPEN,
            });
          });
        });
      };

      // create order for member tenant
      const createOrderLineOnMember = (purchaseOrderId, vendorId, acquisitionMethodId) => {
        return {
          ...BasicOrderLine.defaultOrderLine,
          purchaseOrderId,
          source: 'User',
          claimingActive: false,
          claimingInterval: 45,
          cost: {
            currency: 'USD',
            discountType: 'percentage',
            discount: 10,
            listUnitPrice: 10,
            quantityPhysical: 1,
          },
          physical: {
            createInventory: 'Instance, Holding',
            materialSupplier: vendorId,
          },
          locations: [
            {
              holdingId: testData.holdings.holdingId,
              quantityPhysical: 1,
            },
          ],
          isPackage: false,
          checkinItems: false,
          suppressInstanceFromDiscovery: false,
          instanceId: testData.instance.instanceId,
          titleOrPackage: testData.instance.instanceTitle,
          acquisitionMethod: acquisitionMethodId,
          orderFormat: 'Physical Resource',
        };
      };
      const createOrderWithLineOnMember = (vendorId, acquisitionMethodId) => {
        const order = {
          ...NewOrder.getDefaultOrder({ vendorId }),
          orderType: 'One-Time',
          reEncumber: true,
          approved: true,
        };

        return Orders.createOrderViaApi(order).then((orderResponse) => {
          memberData.order.id = orderResponse.id;
          const orderLine = createOrderLineOnMember(
            orderResponse.id,
            orderResponse.vendorId,
            acquisitionMethodId,
            testData.holdings.location.id,
          );

          return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
            memberData.orderLine = orderLineResponse;

            return Orders.updateOrderViaApi({
              ...orderResponse,
              workflowStatus: ORDER_STATUSES.OPEN,
            });
          });
        });
      };

      before('Create test data', () => {
        cy.getAdminToken();
        ConsortiumManager.enableCentralOrderingViaApi();
        // create instance on central tenant
        InventoryInstance.createInstanceViaApi()
          .then(({ instanceData }) => {
            testData.instance = instanceData;
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
              testData.holdings.location = res;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdings.sourceId = folioSource.id;
            });
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((params) => {
              memberData.acquisitionMethodId = params.body.acquisitionMethods[0].id;
            });
            Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.MOSAIC}"` }).then(
              (organization) => {
                memberData.vendorId = organization.id;
              },
            );
          })
          .then(() => {
            // create holding on member tenant
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instance.instanceId,
              permanentLocationId: testData.holdings.location.id,
              sourceId: testData.holdings.sourceId,
            }).then((resp) => {
              testData.holdings.holdingId = resp.id;

              // create order with order line on member tenant
              createOrderWithLineOnMember(memberData.vendorId, memberData.acquisitionMethodId).then(
                () => {
                  // receive piece for the order line on member tenant
                  return cy.wait(3000).then(() => {
                    return Receiving.getPiecesViaApi(memberData.orderLine.id).then((pieces) => {
                      return Receiving.receivePieceViaApi({
                        poLineId: memberData.orderLine.id,
                        consortia: true,
                        pieces: [
                          {
                            id: pieces[0].id,
                            displayOnHolding: true,
                          },
                        ],
                      });
                    });
                  });
                },
              );
            });
          });

        cy.resetTenant();
        cy.getAdminToken()
          .then(() => {
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((params) => {
              centralData.acquisitionMethodId = params.body.acquisitionMethods[0].id;
            });
            Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.MOSAIC}"` }).then(
              (organization) => {
                centralData.vendorId = organization.id;
              },
            );
          })
          .then(() => {
            // create order with order line on central tenant
            createOrderWithLineOnCentral(
              centralData.vendorId,
              centralData.acquisitionMethodId,
            ).then(() => {
              // receive piece for the order line on central tenant
              return cy.wait(3000).then(() => {
                return Receiving.getPiecesViaApi(centralData.orderLine.id).then((pieces) => {
                  return Receiving.receivePieceViaApi({
                    poLineId: centralData.orderLine.id,
                    consortia: true,
                    pieces: [
                      {
                        id: pieces[0].id,
                        displayOnHolding: true,
                      },
                    ],
                  });
                });
              });
            });
          });

        cy.resetTenant();
        cy.getAdminToken();
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

      after('Delete test data', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.deleteHoldingRecordViaApi(testData.holdings.holdingId);
        Orders.deleteOrderViaApi(memberData.order.id);
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.getAdminToken();
          InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
          Orders.deleteOrderViaApi(centralData.order.id);
          Users.deleteViaApi(testData.user.userId);
        });
      });

      it(
        'C491283 Check Receiving history accordion for shared Holdings with linked central and member tenants (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C491283'] },
        () => {
          const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');

          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkHoldingRecordViewOpened();
          HoldingsRecordView.openAccordion('Receiving history');
          HoldingsRecordView.checkReceivingHistoryAccordionForMemberTenant(todayDate, 'Receiving');
          HoldingsRecordView.checkReceivingHistoryAccordionForCentralTenant(todayDate, 'Receiving');

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkHoldingRecordViewOpened();
          HoldingsRecordView.openAccordion('Receiving history');
          HoldingsRecordView.checkReceivingHistoryAccordionForMemberTenant(todayDate, 'Receiving');
          HoldingsRecordView.checkReceivingHistoryAccordionForCentralTenant(todayDate, 'Receiving');
        },
      );
    });
  });
});
