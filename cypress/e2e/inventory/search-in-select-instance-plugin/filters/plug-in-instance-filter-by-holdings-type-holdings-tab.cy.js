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
import HoldingsTypes from '../../../../support/fragments/settings/inventory/holdings/holdingsTypes';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const numberOfRecords = 11;
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476821_Instance_${randomPostfix}`;
      const holdingsTypePrefix = `AT_C476821_HoldingsType_${randomPostfix}`;
      const holdingsTypeAccordionName = 'Holdings type';
      const organization = NewOrganization.getDefaultOrganization();
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      let instanceTypeId;
      let location;
      let order;
      let user;
      const createdHoldingsTypes = [];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C476821');

          InventoryInstances.getHoldingTypes({ limit: 200 }).then((types) => {
            types.forEach((type) => {
              if (type.name.includes('C476821')) {
                HoldingsTypes.deleteViaApi(type.id);
              }
            });
          });

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((loc) => {
            location = loc;
          });

          for (let i = 0; i < numberOfRecords; i++) {
            HoldingsTypes.createViaApi({
              name: `${holdingsTypePrefix}_${i}`,
              source: 'local',
            }).then((response) => {
              createdHoldingsTypes.push(response.body);
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
            instanceTitles.forEach((title, i) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title,
                },
                holdings: [
                  {
                    holdingsTypeId: createdHoldingsTypes[i].id,
                    permanentLocationId: location.id,
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
              });
              Orders.selectOrderByPONumber(order.poNumber);
              OrderDetails.selectAddPOLine();
              OrderLineEditForm.clickTitleLookUpButton();
              InventorySearchAndFilter.switchToHoldings();
              InventorySearchAndFilter.holdingsTabIsDefault();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(order.id);
        createdHoldingsTypes.forEach((type) => {
          HoldingsTypes.deleteViaApi(type.id);
        });
      });

      it(
        'C476821 "Select Instance" plugin | Filter "Instance" records by "Holdings type" facet on "Holdings" tab (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476821'] },
        () => {
          InventorySearchAndFilter.verifyAccordionExistance(holdingsTypeAccordionName);
          InventorySearchAndFilter.toggleAccordionByName(holdingsTypeAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(holdingsTypeAccordionName);

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          createdHoldingsTypes.forEach((holdingsType) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              holdingsTypeAccordionName,
              holdingsType.name,
            );
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(
            holdingsTypeAccordionName,
            instanceTitles.length,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            holdingsTypeAccordionName,
            createdHoldingsTypes[0].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            holdingsTypeAccordionName,
            createdHoldingsTypes[1].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            holdingsTypeAccordionName,
            createdHoldingsTypes[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            holdingsTypeAccordionName,
            createdHoldingsTypes[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            holdingsTypeAccordionName,
            createdHoldingsTypes[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            holdingsTypeAccordionName,
            createdHoldingsTypes[0].name,
            false,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

          InventorySearchAndFilter.clearFilter(holdingsTypeAccordionName);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            holdingsTypeAccordionName,
            createdHoldingsTypes[0].name,
            false,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            holdingsTypeAccordionName,
            createdHoldingsTypes[1].name,
            false,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            holdingsTypeAccordionName,
            createdHoldingsTypes[2].name.slice(1),
            createdHoldingsTypes[2].name,
          );
          SelectInstanceModal.typeValueInMultiSelectFilterFieldAndCheck(
            holdingsTypeAccordionName,
            createdHoldingsTypes[3].name,
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            holdingsTypeAccordionName,
            createdHoldingsTypes[3].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            holdingsTypeAccordionName,
            createdHoldingsTypes[3].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[3]);
        },
      );
    });
  });
});
