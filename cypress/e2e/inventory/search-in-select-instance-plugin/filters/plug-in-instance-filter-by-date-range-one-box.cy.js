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

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C553055_FolioInstance_${randomPostfix}`;
      const dateRangeAccordionName = 'Date range';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C553055_Org_${randomPostfix}`;
      const date1Values = Array.from({ length: 5 }, (_, i) => `${1902 + i}`);
      const instanceTitles = Array.from(
        { length: date1Values.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      let instanceTypeId;
      let order;
      let user;
      let instanceDateTypeIds;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('C553055_');

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getInstanceDateTypesViaAPI().then(({ instanceDateTypes }) => {
            instanceDateTypeIds = instanceDateTypes.map((type) => type.id);
          });
        })
          .then(() => {
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
            date1Values.forEach((date1, index) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceTitles[index],
                  dates: {
                    dateTypeId: instanceDateTypeIds[index],
                    date1,
                  },
                },
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
              });
              Orders.selectOrderByPONumber(order.poNumber);
              OrderDetails.selectAddPOLine();
              OrderLineEditForm.clickTitleLookUpButton();
              InventorySearchAndFilter.instanceTabIsDefault();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
      });

      it(
        'C553055 "Select Instance" plugin | Filter "Instance" records by "Date range" filter using one box ("From" / "To") (promin)',
        { tags: ['extendedPath', 'promin', 'C553055'] },
        () => {
          // Step 1: Search; verify all instances found with dates 1902-1906
          SelectInstanceModal.searchByName(instanceTitlePrefix);
          date1Values.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          // Step 2: Filter using From=1904 only (To empty); verify 1904-1906
          InventorySearchAndFilter.filterByDateRange(date1Values[2], '');
          date1Values.slice(2).forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(3);

          // Step 3: Clear From, filter using To=1904 only; verify 1902-1904
          InventorySearchAndFilter.toggleAccordionByName(dateRangeAccordionName, false);
          InventorySearchAndFilter.filterByDateRange('', date1Values[2]);
          date1Values.slice(0, 3).forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(3);

          // Step 4: Click x icon in Date range accordion; verify filter cleared
          InventorySearchAndFilter.clearFilter(dateRangeAccordionName);
          date1Values.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyDateRangeAccordionValues('', '');
        },
      );
    });
  });
});
