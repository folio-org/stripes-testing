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
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476829_Instance_${randomPostfix}`;
      const sourceAccordionName = 'Source';
      const organization = NewOrganization.getDefaultOrganization();
      organization.name = `AT_C476829_Org_${randomPostfix}`;
      const instancesData = [
        { source: INSTANCE_SOURCE_NAMES.FOLIO },
        { source: INSTANCE_SOURCE_NAMES.MARC },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      let order;
      let user;
      let instanceTypeId;
      let location;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C476829');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((loc) => {
            location = loc;
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
              if (data.source === INSTANCE_SOURCE_NAMES.FOLIO) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceTitles[index],
                  },
                  holdings: [
                    {
                      permanentLocationId: location.id,
                    },
                  ],
                });
              } else {
                cy.createSimpleMarcBibViaAPI(instanceTitles[index]).then((instanceId) => {
                  cy.getInstanceById(instanceId).then((instanceData) => {
                    cy.createSimpleMarcHoldingsViaAPI(
                      instanceData.id,
                      instanceData.hrid,
                      location.code,
                    );
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
      });

      it(
        'C476829 "Select Instance" plugin | Filter "Instance" records by "Source" filter on "Holdings" segment (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476829'] },
        () => {
          InventorySearchAndFilter.verifyAccordionExistance(sourceAccordionName, true);
          InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sourceAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            sourceAccordionName,
            INSTANCE_SOURCE_NAMES.FOLIO,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            sourceAccordionName,
            INSTANCE_SOURCE_NAMES.MARC,
          );

          cy.then(() => {
            cy.intercept('/search/instances*').as('getInstances1');
            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
            );
            cy.wait('@getInstances1', { timeout: 10_000 }).then((instances1) => {
              InventorySearchAndFilter.verifyResultListExists();
              InventorySearchAndFilter.verifyFilterOptionCount(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.FOLIO,
                instances1.response.body.totalRecords,
              );
              SelectInstanceModal.checkModalIncludesText(
                new RegExp(
                  `^${instances1.response.body.totalRecords.toLocaleString('en-US')} record`,
                ),
              );
            });
          })
            .then(() => {
              cy.intercept('/search/instances*').as('getInstances2');
              InventorySearchAndFilter.selectOptionInExpandedFilter(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.MARC,
              );
              cy.wait('@getInstances2', { timeout: 10_000 }).then((instances2) => {
                InventorySearchAndFilter.verifyResultListExists();
                SelectInstanceModal.checkModalIncludesText(
                  new RegExp(
                    `^${instances2.response.body.totalRecords.toLocaleString('en-US')} record`,
                  ),
                );
              });
            })
            .then(() => {
              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectOptionInExpandedFilter(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.FOLIO,
                false,
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then((instances3) => {
                InventorySearchAndFilter.verifyResultListExists();
                InventorySearchAndFilter.verifyFilterOptionCount(
                  sourceAccordionName,
                  INSTANCE_SOURCE_NAMES.MARC,
                  instances3.response.body.totalRecords,
                );
                SelectInstanceModal.checkModalIncludesText(
                  new RegExp(
                    `^${instances3.response.body.totalRecords.toLocaleString('en-US')} record`,
                  ),
                );
              });
            })
            .then(() => {
              InventorySearchAndFilter.clearFilter(sourceAccordionName);
              SelectInstanceModal.checkTableContent();
              InventorySearchAndFilter.verifyCheckboxInAccordion(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.FOLIO,
                false,
              );
              InventorySearchAndFilter.verifyCheckboxInAccordion(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.MARC,
                false,
              );

              SelectInstanceModal.searchByName(instanceTitlePrefix);
              instanceTitles.forEach((title) => {
                InventorySearchAndFilter.verifySearchResult(title);
              });
              InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

              InventorySearchAndFilter.selectOptionInExpandedFilter(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.MARC,
              );
              InventorySearchAndFilter.verifyNumberOfSearchResults(1);
              InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
              InventorySearchAndFilter.verifyFilterOptionCount(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.MARC,
                1,
              );

              InventorySearchAndFilter.selectOptionInExpandedFilter(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.MARC,
                false,
              );
              InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
              instanceTitles.forEach((title) => {
                InventorySearchAndFilter.verifySearchResult(title);
              });
              InventorySearchAndFilter.verifyFilterOptionCount(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.FOLIO,
                1,
              );
              InventorySearchAndFilter.verifyFilterOptionCount(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.MARC,
                1,
              );

              InventorySearchAndFilter.selectOptionInExpandedFilter(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.FOLIO,
              );
              InventorySearchAndFilter.verifyNumberOfSearchResults(1);
              InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
              InventorySearchAndFilter.verifyFilterOptionCount(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.FOLIO,
                1,
              );

              InventorySearchAndFilter.selectOptionInExpandedFilter(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.FOLIO,
                false,
              );
              InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
              instanceTitles.forEach((title) => {
                InventorySearchAndFilter.verifySearchResult(title);
              });
              InventorySearchAndFilter.verifyFilterOptionCount(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.FOLIO,
                1,
              );
              InventorySearchAndFilter.verifyFilterOptionCount(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.MARC,
                1,
              );

              InventorySearchAndFilter.selectOptionInExpandedFilter(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.FOLIO,
              );
              InventorySearchAndFilter.selectOptionInExpandedFilter(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.MARC,
              );
              InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
              instanceTitles.forEach((title) => {
                InventorySearchAndFilter.verifySearchResult(title);
              });
              InventorySearchAndFilter.verifyFilterOptionCount(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.FOLIO,
                1,
              );
              InventorySearchAndFilter.verifyFilterOptionCount(
                sourceAccordionName,
                INSTANCE_SOURCE_NAMES.MARC,
                1,
              );
            });
        },
      );
    });
  });
});
