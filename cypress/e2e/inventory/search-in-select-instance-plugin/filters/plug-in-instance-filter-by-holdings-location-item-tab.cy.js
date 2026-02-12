import { ITEM_STATUS_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476820_Instance_${randomPostfix}`;
      const locationAccordionName = 'Holdings permanent location';
      const organization = NewOrganization.getDefaultOrganization();
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          holdingsLocationIndex: 0,
          itemLocationIndex: null,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          holdingsLocationIndex: 1,
          itemLocationIndex: 2,
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      let instanceTypeId;
      let materialTypeId;
      const locations = [];
      let order;
      let loanTypeId;
      let holdingsSourceId;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C476820');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({ limit: 3, query: '(isActive=true and name<>"AT_*")' }).then(() => {
            locations.push(...Cypress.env('locations'));
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
            materialTypeId = matType.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            holdingsSourceId = folioSource.id;
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
              if (data.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceTitles[index],
                  },
                  holdings: [
                    {
                      permanentLocationId: locations[data.holdingsLocationIndex].id,
                    },
                  ],
                  items: [
                    {
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypeId },
                      materialType: { id: materialTypeId },
                      permanentLocation: {
                        id: locations[data.itemLocationIndex].id,
                      },
                    },
                  ],
                });
              } else {
                const marcInstanceFields = [
                  {
                    tag: '008',
                    content: QuickMarcEditor.defaultValid008Values,
                  },
                  {
                    tag: '245',
                    content: `$a ${instanceTitles[index]}`,
                    indicators: ['1', '1'],
                  },
                ];
                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcInstanceFields,
                ).then((instanceId) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId,
                    permanentLocationId: locations[data.holdingsLocationIndex].id,
                    sourceId: holdingsSourceId,
                  }).then((holding) => {
                    InventoryItems.createItemViaApi({
                      holdingsRecordId: holding.id,
                      materialType: { id: materialTypeId },
                      permanentLoanType: { id: loanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    });
                  });
                });
              }
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
        'C476820 "Select Instance" plugin | Filter "Instance" records by "Holdings permanent location" facet in "Item" tab (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476820'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
          SelectInstanceModal.checkOptionsWithCountersExistInAccordion(locationAccordionName);

          SelectInstanceModal.searchByName(instanceTitlePrefix);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          [locations[0], locations[1]].forEach((location) => {
            SelectInstanceModal.verifyOptionAvailableMultiselect(
              locationAccordionName,
              location.name,
            );
          });
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(locationAccordionName, 2);

          SelectInstanceModal.selectMultiSelectFilterOption(
            locationAccordionName,
            locations[0].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

          SelectInstanceModal.selectMultiSelectFilterOption(
            locationAccordionName,
            locations[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            locationAccordionName,
            locations[0].name,
            false,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          InventorySearchAndFilter.checkRowsCount(instanceTitles.length);

          SelectInstanceModal.selectMultiSelectFilterOption(
            locationAccordionName,
            locations[0].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          SelectInstanceModal.selectMultiSelectFilterOption(
            locationAccordionName,
            locations[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            locationAccordionName,
            locations[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            locationAccordionName,
            locations[1].name,
          );
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          InventorySearchAndFilter.clearFilter(locationAccordionName);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            locationAccordionName,
            locations[0].name,
            false,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            locationAccordionName,
            locations[1].name,
            false,
          );
          SelectInstanceModal.verifyMultiSelectFilterNumberOfOptions(locationAccordionName, 2);
          instanceTitles.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });

          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            locationAccordionName,
            locations[0].name.slice(1),
            locations[0].name,
          );
          SelectInstanceModal.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            locationAccordionName,
            '',
            '',
          );

          SelectInstanceModal.selectMultiSelectFilterOption(
            locationAccordionName,
            locations[1].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            locationAccordionName,
            locations[1].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
        },
      );
    });
  });
});
