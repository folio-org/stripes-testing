import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476758_Instance_${randomPostfix}`;
      const sourceAccordionName = 'Source';
      const instancesData = [
        { source: INSTANCE_SOURCE_NAMES.FOLIO },
        { source: INSTANCE_SOURCE_NAMES.MARC },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      let user;
      let instanceTypeId;
      let location;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C476758');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((loc) => {
            location = loc;
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
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              InventorySearchAndFilter.switchToHoldings();
              InventorySearchAndFilter.holdingsTabIsDefault();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476758 Filter "Instance" records by Holdings "Source" filter (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476758'] },
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
              InventoryInstances.checkSearchResultCount(
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
                InventoryInstances.checkSearchResultCount(
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
                InventoryInstances.checkSearchResultCount(
                  new RegExp(
                    `^${instances3.response.body.totalRecords.toLocaleString('en-US')} record`,
                  ),
                );
              });
            })
            .then(() => {
              InventorySearchAndFilter.clearFilter(sourceAccordionName);
              InventorySearchAndFilter.verifyResultPaneEmpty();
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

              InventorySearchAndFilter.executeSearch(instanceTitlePrefix);
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
              InventoryInstances.selectInstance(0);
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.openHoldingView();
              HoldingsRecordView.checkSource(INSTANCE_SOURCE_NAMES.MARC);
              HoldingsRecordView.close();
              InventorySearchAndFilter.closeInstanceDetailPane();

              InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
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
            });
        },
      );
    });
  });
});
