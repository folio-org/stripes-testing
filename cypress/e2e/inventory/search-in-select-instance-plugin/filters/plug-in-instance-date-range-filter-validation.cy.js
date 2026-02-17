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
      const instanceTitlePrefix = `AT_C553058_FolioInstance_${randomPostfix}`;
      const dateRangeAccordionName = 'Date range';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C553058_Org_${randomPostfix}`;
      const date1Values = Array.from({ length: 5 }, (_, i) => `${1902 + i}`);
      const instanceTitles = Array.from(
        { length: date1Values.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );
      const filterData = [
        { range: ['1902', '1906'] },
        {
          range: ['19035', '19056'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['19035', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', '19055'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['190', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', '190'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['0', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', '9'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['190u', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', 'd905'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['190\\', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', '19_5'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        {
          range: ['190 ', '1905'],
          fromError: InventorySearchAndFilter.invalidDateErrorText,
          toError: false,
        },
        {
          range: ['1903', '19 5'],
          fromError: false,
          toError: InventorySearchAndFilter.invalidDateErrorText,
        },
        { range: ['1935', '1934'], fromError: InventorySearchAndFilter.dateOrderErrorText },
      ];

      let instanceTypeId;
      let order;
      let user;
      let instanceDateTypeIds;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C553058');

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
        'C553058 "Select Instance" plugin | Validation of "From" / "To" boxes in "Date range" filter (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C553058'] },
        () => {
          SelectInstanceModal.searchByName(instanceTitlePrefix);
          date1Values.forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          filterData.forEach((filterDatum) => {
            InventorySearchAndFilter.filterByDateRange(
              ...filterDatum.range,
              filterDatum.fromError,
              filterDatum.toError,
            );
            date1Values.forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(date1Values.length);
            InventorySearchAndFilter.toggleAccordionByName(dateRangeAccordionName, false);
          });
          InventorySearchAndFilter.toggleAccordionByName(dateRangeAccordionName);
          InventorySearchAndFilter.verifyErrorMessageInAccordion(
            InventorySearchAndFilter.dateRangeAccordion,
            InventorySearchAndFilter.dateOrderErrorText,
          );
          SelectInstanceModal.clickResetAllButton();
          SelectInstanceModal.checkTableContent();
          SelectInstanceModal.checkSearchInputCleared();
          InventorySearchAndFilter.verifyDateRangeAccordionValues('', '');
          InventorySearchAndFilter.verifyErrorMessageInTextField(
            InventorySearchAndFilter.dateRangeFromField,
            false,
          );
          InventorySearchAndFilter.verifyErrorMessageInTextField(
            InventorySearchAndFilter.dateRangeToField,
            false,
          );
        },
      );
    });
  });
});
