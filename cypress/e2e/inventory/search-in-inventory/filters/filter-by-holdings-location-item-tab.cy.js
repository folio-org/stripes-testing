import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const numberOfRecords = 3;
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C476760_Instance_${randomPostfix}`;
      const locationAccordionName = 'Holdings permanent location';
      const instanceTitles = Array.from(
        { length: numberOfRecords },
        (_, i) => `${instanceTitlePrefix}_${i}`,
      );

      let instanceTypeId;
      const locations = [];
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C476760');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({
            limit: 3,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then(() => {
            locations.push(...Cypress.env('locations'));
          });
        })
          .then(() => {
            instanceTitles.forEach((title, index) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title,
                },
                holdings: [
                  {
                    permanentLocationId: locations[index].id,
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
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.itemTabIsDefault();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476760 Filter "Instance" records by "Holdings permanent location" facet in "Item" segment (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476760'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(locationAccordionName);

          cy.then(() => {
            cy.intercept('/search/instances*').as('getInstances1');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationAccordionName,
              locations[0].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              locationAccordionName,
              locations[0].name,
              true,
            );
            cy.wait('@getInstances1', { timeout: 10_000 }).then((instances1) => {
              InventorySearchAndFilter.verifyResultListExists();
              InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                locationAccordionName,
                locations[0].name,
                instances1.response.body.totalRecords,
              );
              InventoryInstances.checkSearchResultCount(
                new RegExp(
                  `^${instances1.response.body.totalRecords.toLocaleString('en-US')} record`,
                ),
              );
              InventoryInstances.selectInstance(0);
              InventoryInstance.waitLoading();
              InventoryInstance.checkPresentedText(locations[0].name);
              InventorySearchAndFilter.closeInstanceDetailPane();
            });
          })
            .then(() => {
              cy.intercept('/search/instances*').as('getInstances2');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                locationAccordionName,
                locations[1].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                locationAccordionName,
                locations[1].name,
                true,
              );
              cy.wait('@getInstances2', { timeout: 10_000 }).then((instances2) => {
                InventorySearchAndFilter.verifyResultListExists();
                InventoryInstances.checkSearchResultCount(
                  new RegExp(
                    `^${instances2.response.body.totalRecords.toLocaleString('en-US')} record`,
                  ),
                );
              });
              InventoryInstances.selectInstance(0);
              InventoryInstance.waitLoading();
              InventorySearchAndFilter.closeInstanceDetailPane();
            })
            .then(() => {
              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                locationAccordionName,
                locations[0].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                locationAccordionName,
                locations[0].name,
                false,
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then((instances3) => {
                InventorySearchAndFilter.verifyResultListExists();
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  locationAccordionName,
                  locations[1].name,
                  instances3.response.body.totalRecords,
                );
                InventoryInstances.checkSearchResultCount(
                  new RegExp(
                    `^${instances3.response.body.totalRecords.toLocaleString('en-US')} record`,
                  ),
                );
                InventoryInstances.selectInstance(0);
                InventoryInstance.waitLoading();
                InventoryInstance.checkPresentedText(locations[1].name);
                InventorySearchAndFilter.closeInstanceDetailPane();
              });
            })
            .then(() => {
              InventorySearchAndFilter.clearFilter(locationAccordionName);
              InventorySearchAndFilter.verifyResultPaneEmpty();

              InventorySearchAndFilter.executeSearch(instanceTitlePrefix);
              InventorySearchAndFilter.verifyResultListExists();

              InventorySearchAndFilter.selectMultiSelectFilterOption(
                locationAccordionName,
                locations[0].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                locationAccordionName,
                locations[0].name,
                true,
              );
              InventorySearchAndFilter.verifyNumberOfSearchResults(1);
              InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
              InventoryInstances.selectInstance(0);
              InventoryInstance.waitLoading();
              InventoryInstance.checkPresentedText(locations[0].name);
              InventorySearchAndFilter.closeInstanceDetailPane();

              InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                locationAccordionName,
                locations[1].name,
              );

              InventorySearchAndFilter.selectMultiSelectFilterOption(
                locationAccordionName,
                locations[1].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                locationAccordionName,
                locations[1].name,
                true,
              );
              InventorySearchAndFilter.verifyNumberOfSearchResults(2);
              InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
              InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

              InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                locationAccordionName,
                locations[2].name.slice(1),
                locations[2].name,
              );
            });
        },
      );
    });
  });
});
