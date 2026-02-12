import uuid from 'uuid';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import { NewOrder, Orders } from '../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import OrderLineEditForm from '../../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const numberOfRecords = 11;
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const instanceTitlePrefix = `AT_C476778_FolioInstance_${randomPostfix}`;
      const resourceTypePrefix = `AT_C553011_type_${randomPostfix}`;
      const resourceTypeCodePrefix = `C553011type${randomLetters}`;
      const resourceTypeAccordionName = 'Resource type';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C476778_Org_${randomPostfix}`;
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      const resourceTypes = [];
      const customTypes = [];
      let order;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C476778');

          cy.getInstanceTypes({ limit: numberOfRecords - 2, query: 'source=rdacontent' }).then(
            (instanceTypes) => {
              resourceTypes.push(...instanceTypes);

              for (let i = 0; i < 2; i++) {
                cy.createInstanceType({
                  code: `${resourceTypeCodePrefix}_${i}`,
                  id: uuid(),
                  name: `${resourceTypePrefix}_${i}`,
                  source: 'local',
                }).then((type) => {
                  resourceTypes.push(type);
                  customTypes.push(type);
                });
              }
            },
          );

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
            resourceTypes.forEach((type, index) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: type.id,
                  title: instanceTitles[index],
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
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
        customTypes.forEach((type) => {
          cy.deleteInstanceType(type.id);
        });
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
      });

      it(
        'C476778 "Select Instance" plugin | Filter "Instance" records by "Resource Type" filter/facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476778'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(resourceTypeAccordionName);

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          resourceTypes.forEach((type) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              resourceTypeAccordionName,
              type.name,
            );
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            resourceTypeAccordionName,
            resourceTypes.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            resourceTypeAccordionName,
            resourceTypes[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            resourceTypeAccordionName,
            resourceTypes[0].name,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            resourceTypeAccordionName,
            resourceTypes[0].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            resourceTypeAccordionName,
            resourceTypes[1].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            resourceTypeAccordionName,
            resourceTypes[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            resourceTypeAccordionName,
            resourceTypes[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            resourceTypeAccordionName,
            resourceTypes[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            resourceTypeAccordionName,
            resourceTypes[0].name,
            false,
          );
          SelectInstanceModal.selectMultiSelectFilterOption(
            resourceTypeAccordionName,
            resourceTypes[1].name,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            resourceTypeAccordionName,
            resourceTypes[1].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          InventorySearchAndFilter.clearFilter(resourceTypeAccordionName);
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            resourceTypeAccordionName,
            0,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            resourceTypeAccordionName,
            customTypes[0].name.slice(1),
            customTypes[0].name,
          );
          SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
            resourceTypeAccordionName,
            customTypes[1].name,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            resourceTypeAccordionName,
            customTypes[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles.at(-1));
        },
      );
    });
  });
});
