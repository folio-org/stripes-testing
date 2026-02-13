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
      const instanceTitlePrefix = `AT_C553059_FolioInstance_${randomPostfix}`;
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C553059_Org_${randomPostfix}`;
      const date1Values = ['1955', '1954', ''];
      const date2Values = ['2022', '1955', '1956'];
      const instanceTitles = Array.from(
        { length: date1Values.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );
      const getExpectedDates = (from, to) => date1Values.filter((date) => {
        const dateInt = parseInt(date, 10);
        return dateInt >= parseInt(from, 10) && dateInt <= parseInt(to, 10);
      });
      const searchData = { from: '1955', to: '2022' };

      let instanceTypeId;
      let order;
      let user;
      let instanceDateTypeIds;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C553059');

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
                    date2: date2Values[index],
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
        'C553059 "Select Instance" plugin | Verify that "Date range" filter is working on "Date 1" field only (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C553059'] },
        () => {
          SelectInstanceModal.searchByName(instanceTitlePrefix);
          date1Values.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          InventorySearchAndFilter.filterByDateRange(searchData.from, searchData.to);
          const expectedDates = getExpectedDates(searchData.from, searchData.to);
          expectedDates.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(expectedDates.length);
        },
      );
    });
  });
});
