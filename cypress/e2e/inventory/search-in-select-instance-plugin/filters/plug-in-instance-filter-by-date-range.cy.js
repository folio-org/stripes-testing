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
      const instanceTitlePrefix = `AT_C553057_FolioInstance_${randomPostfix}`;
      const dateRangeAccordionName = 'Date range';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C553057_Org_${randomPostfix}`;
      const date1Values = Array.from({ length: 5 }, (_, i) => `${1902 + i}`);
      const instanceTitles = Array.from(
        { length: date1Values.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );
      const getExpectedDates = (from, to) => date1Values.filter((date) => {
        const dateInt = parseInt(date, 10);
        return dateInt >= parseInt(from, 10) && dateInt <= parseInt(to, 10);
      });
      const searchData = [
        { from: '1903', to: '1905' },
        { from: '1903', to: '1903' },
        { from: '1899', to: '1999' },
      ];

      let instanceTypeId;
      let order;
      let user;
      let instanceDateTypeIds;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C553057');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
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
                authRefresh: true,
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
        'C553057 "Select Instance" plugin | Filter "Instance" records by "Date range" filter using "From" and "To" boxes (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C553057'] },
        () => {
          SelectInstanceModal.searchByName(instanceTitlePrefix);
          date1Values.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          InventorySearchAndFilter.toggleAccordionByName(dateRangeAccordionName);
          InventorySearchAndFilter.verifyDateRangeAccordionValues('', '');

          searchData.forEach((search) => {
            InventorySearchAndFilter.toggleAccordionByName(dateRangeAccordionName, false);
            InventorySearchAndFilter.filterByDateRange(search.from, search.to);
            const expectedDates = getExpectedDates(search.from, search.to);
            expectedDates.forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(expectedDates.length);
          });

          InventorySearchAndFilter.toggleAccordionByName(dateRangeAccordionName, false);
          const lastExpectedDates = getExpectedDates(searchData.at(-1).from, searchData.at(-1).to);
          lastExpectedDates.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(lastExpectedDates.length);

          InventorySearchAndFilter.toggleAccordionByName(dateRangeAccordionName);
          InventorySearchAndFilter.verifyDateRangeAccordionValues(
            searchData.at(-1).from,
            searchData.at(-1).to,
          );
          lastExpectedDates.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(lastExpectedDates.length);

          SelectInstanceModal.clickResetAllButton();
          SelectInstanceModal.checkTableContent();
          SelectInstanceModal.checkSearchInputCleared();
          InventorySearchAndFilter.verifyDateRangeAccordionValues('', '');
        },
      );
    });
  });
});
