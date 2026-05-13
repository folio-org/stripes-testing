import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LOCATION_NAMES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../../support/fragments/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Instance', () => {
      const organization = NewOrganization.getDefaultOrganization();
      const testData = {
        organization,
        order: {
          ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
          orderType: 'One-Time',
          approved: true,
        },
        user: {},
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
          (locationResponse) => {
            testData.location = locationResponse.id;

            Organizations.createOrganizationViaApi(organization).then((orgResponse) => {
              organization.id = orgResponse;

              cy.getDefaultMaterialType().then((materialType) => {
                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                }).then((acquisitionMethodResponse) => {
                  testData.orderLine = {
                    ...BasicOrderLine.getDefaultOrderLine(),
                    cost: {
                      listUnitPrice: 10,
                      currency: 'USD',
                      discountType: 'percentage',
                      quantityPhysical: 1,
                    },
                    orderFormat: 'Physical Resource',
                    acquisitionMethod: acquisitionMethodResponse.body.acquisitionMethods[0].id,
                    physical: {
                      createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
                      materialType: materialType.id,
                    },
                    locations: [
                      {
                        locationId: locationResponse.id,
                        quantity: 1,
                        quantityPhysical: 1,
                      },
                    ],
                  };

                  Orders.createOrderViaApi(testData.order).then((orderResponse) => {
                    testData.order = orderResponse;
                    testData.orderLine.purchaseOrderId = orderResponse.id;

                    OrderLines.createOrderLineViaApi(testData.orderLine);
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

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory],
          );

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Orders.deleteOrderViaApi(testData.order.id);
        Organizations.deleteOrganizationViaApi(organization.id);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHrid}"`,
        }).then((instanceResp) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceResp.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C655281 Check "Version history" after creating Instance, Holdings, Item via Orders (folijet)',
        { tags: ['extendedPath', 'folijet', 'C655281'] },
        () => {
          // Navigate to Inventory, search for the instance created via Orders
          InventoryInstances.searchByTitle(testData.orderLine.titleOrPackage);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.getAssignedHRID().then((hrid) => {
            testData.instanceHrid = hrid;
          });
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(1);
          VersionHistorySection.verifyVersionHistoryCard(0);
          VersionHistorySection.clickCloseButton();

          // Navigate to Holdings and check version history
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(1);
          VersionHistorySection.verifyVersionHistoryCard(0);
          VersionHistorySection.clickCloseButton();

          // Navigate to Item and check version history
          HoldingsRecordView.close();
          InstanceRecordView.openHoldingsAccordion(LOCATION_NAMES.MAIN_LIBRARY_UI);
          InstanceRecordView.openItemByHyperlink('No barcode');
          ItemRecordView.waitLoading();
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(1);
          VersionHistorySection.verifyVersionHistoryCard(0);
          VersionHistorySection.clickCloseButton();
        },
      );
    });
  });
});
