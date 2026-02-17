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
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceStatusTypes from '../../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const numberOfRecords = 11;
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const instanceTitlePrefix = `AT_C476815_FolioInstance_${randomPostfix}`;
      const instanceStatusAccordionName = 'Instance status';
      const instanceStatusPrefix = `AT_C476815_${randomLetters}`;
      const codePrefix = `c476815${randomLetters}`;
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C476815_Org_${randomPostfix}`;
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      let instanceTypeId;
      let order;
      let user;
      const createdRecordIds = [];
      const instanceStatuses = [];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C476815');

          InstanceStatusTypes.getViaApi({ limit: 200 }).then((types) => {
            types.forEach((type) => {
              if (type.name.includes('C476732')) {
                InstanceStatusTypes.deleteViaApi(type.id);
              }
            });
          });
        })
          .then(() => {
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((types) => {
              instanceTypeId = types[0].id;
            });
            for (let i = 0; i < numberOfRecords; i++) {
              InstanceStatusTypes.createViaApi({
                name: `${instanceStatusPrefix}_${i}`,
                code: `${codePrefix}_${i}`,
                source: 'local',
              }).then((response) => {
                instanceStatuses.push(response.body);
              });
            }
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
            for (let i = 0; i < numberOfRecords; i++) {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceTitles[i],
                  statusId: instanceStatuses[i].id,
                },
              }).then((instance) => {
                createdRecordIds.push(instance.instanceId);
              });
            }
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
        createdRecordIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
        instanceStatuses.forEach((status) => {
          InstanceStatusTypes.deleteViaApi(status.id);
        });
      });

      it(
        'C476815 "Select Instance" plugin | Filter "Instance" records by "Instance status" facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476815'] },
        () => {
          InventorySearchAndFilter.verifyAccordionExistance(instanceStatusAccordionName, true);
          InventorySearchAndFilter.toggleAccordionByName(instanceStatusAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(instanceStatusAccordionName);

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          instanceStatuses.forEach((status) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              instanceStatusAccordionName,
              status.name,
            );
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            instanceStatusAccordionName,
            instanceStatuses.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            instanceStatusAccordionName,
            instanceStatuses[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            instanceStatusAccordionName,
            instanceStatuses[0].name,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            instanceStatusAccordionName,
            instanceStatuses[0].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            instanceStatusAccordionName,
            instanceStatuses[1].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            instanceStatusAccordionName,
            instanceStatuses[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            instanceStatusAccordionName,
            instanceStatuses[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            instanceStatusAccordionName,
            instanceStatuses[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            instanceStatusAccordionName,
            instanceStatuses[0].name,
            false,
          );
          SelectInstanceModal.verifyMultiSelectFilterOptionCount(
            instanceStatusAccordionName,
            instanceStatuses[1].name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.checkModalIncludesText(/^1 record found/);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          InventorySearchAndFilter.clearFilter(instanceStatusAccordionName);
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            instanceStatusAccordionName,
            0,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            instanceStatusAccordionName,
            instanceStatuses[2].name.slice(1),
            instanceStatuses[2].name,
          );
          SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
            instanceStatusAccordionName,
            instanceStatuses[3].name,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            instanceStatusAccordionName,
            instanceStatuses[3].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[3]);
        },
      );
    });
  });
});
