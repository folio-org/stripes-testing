import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { NewOrder, Orders } from '../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import OrderLineEditForm from '../../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../../support/fragments/orders/modals/selectInstanceModal';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476833_Instance_${randomPostfix}`;
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C476833_Org_${randomPostfix}`;
      const suppressFromDiscoveryAccordionName = 'Suppress from discovery';
      const instancesData = [{ isItemSuppressDiscovery: false }, { isItemSuppressDiscovery: true }];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );
      const suppressedInstanceTitles = instanceTitles.filter(
        (_, index) => instancesData[index].isItemSuppressDiscovery,
      );
      const notSuppressedInstanceTitles = instanceTitles.filter(
        (_, index) => !instancesData[index].isItemSuppressDiscovery,
      );

      let order;
      let user;
      let instanceTypeId;
      let locationId;
      let loanTypeId;
      let materialTypeId;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C476833');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((loc) => {
            locationId = loc.id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
            materialTypeId = matType.id;
          });
          Organizations.createOrganizationViaApi(organization).then(() => {
            const orderData = NewOrder.getDefaultOngoingOrder({
              vendorId: organization.id,
            });
            Orders.createOrderViaApi(orderData).then((createdOrder) => {
              order = createdOrder;
            });
          });
        })
          .then(() => {
            instancesData.forEach((data, index) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceTitles[index],
                },
                holdings: [
                  {
                    permanentLocationId: locationId,
                  },
                ],
                items: [
                  {
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypeId },
                    discoverySuppress: data.isItemSuppressDiscovery,
                  },
                ],
              });
            });
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiOrdersCreate.gui,
            ]).then((userProperties) => {
              user = userProperties;

              cy.login(user.username, user.password, {
                path: TopMenu.ordersPath,
                waiter: Orders.waitLoading,
                authRefresh: true,
              });
              Orders.selectOrderByPONumber(order.poNumber);
              OrderDetails.selectAddPOLine();
              OrderLineEditForm.clickTitleLookUpButton();
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.itemTabIsDefault();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
      });

      it(
        'C476833 "Select Instance" plugin | Filter "Instance" records by "Suppress from discovery" filter in "Item" segment (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476833'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(suppressFromDiscoveryAccordionName);
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            suppressFromDiscoveryAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            suppressFromDiscoveryAccordionName,
            'No',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            suppressFromDiscoveryAccordionName,
            'Yes',
            false,
          );

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            suppressFromDiscoveryAccordionName,
            'Yes',
          );
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.verifyNumberOfSearchResults(suppressedInstanceTitles.length);
          suppressedInstanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            suppressFromDiscoveryAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            suppressFromDiscoveryAccordionName,
            'No',
          );
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.verifyNumberOfSearchResults(notSuppressedInstanceTitles.length);
          notSuppressedInstanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            suppressFromDiscoveryAccordionName,
            'No',
            false,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
        },
      );
    });
  });
});
