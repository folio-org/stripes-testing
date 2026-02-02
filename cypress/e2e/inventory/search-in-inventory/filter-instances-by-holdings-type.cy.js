import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { or } from '../../../../interactors';
import HoldingsTypes from '../../../support/fragments/settings/inventory/holdings/holdingsTypes';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const testData = {
        instancesTitlePrefix: `AT_C476753_FolioInstance_${randomPostfix}`,
        holdingsTypeAccordionName: 'Holdings type',
        holdingsTypePrefix: `AT_C476753_${randomLetters}`,
        source: 'local',
      };
      const holdingsTypes = [];
      let instanceTypeId;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        InventoryInstances.getHoldingTypes({ limit: 200 }).then((types) => {
          types.forEach((type) => {
            if (type.name.includes('C476753')) {
              HoldingsTypes.deleteViaApi(type.id);
            }
          });
        });
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
          (createdUserProperties) => {
            user = createdUserProperties;
            cy.then(() => {
              cy.getInstanceTypes({ limit: 200 }).then((types) => {
                instanceTypeId = types.filter((item) => item.source === 'rdacontent')[0].id;
              });
              cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
                (res) => {
                  testData.locationId = res.id;
                },
              );
              for (let i = 0; i < 4; i++) {
                HoldingsTypes.createViaApi({
                  name: `${testData.holdingsTypePrefix}_${i}`,
                  source: testData.source,
                }).then((response) => {
                  holdingsTypes.push(response.body);
                });
              }
            })
              .then(() => {
                for (let i = 0; i < 4; i++) {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: `${testData.instancesTitlePrefix}_${i}`,
                    },
                    holdings: [
                      {
                        holdingsTypeId: holdingsTypes[i].id,
                        permanentLocationId: testData.locationId,
                      },
                    ],
                  });
                }
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${4}`,
                  },
                  holdings: [
                    {
                      holdingsTypeId: holdingsTypes[1].id,
                      permanentLocationId: testData.locationId,
                    },
                  ],
                });
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${5}`,
                  },
                  holdings: [
                    {
                      holdingsTypeId: holdingsTypes[3].id,
                      permanentLocationId: testData.locationId,
                    },
                  ],
                });
              })
              .then(() => {
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                  authRefresh: true,
                });
                InventorySearchAndFilter.instanceTabIsDefault();
                InventorySearchAndFilter.switchToHoldings();
                InventorySearchAndFilter.holdingsTabIsDefault();
              });
          },
        );
      });

      after('Delete user, test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(`${testData.instancesTitlePrefix}*`);
        holdingsTypes.forEach((type) => {
          HoldingsTypes.deleteViaApi(type.id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476753 Filter "Instance" records by "Holdings type" facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476753'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(testData.holdingsTypeAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.holdingsTypeAccordionName,
          );
          cy.intercept('/search/instances*').as('getInstances1');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.holdingsTypeAccordionName,
            holdingsTypes[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.holdingsTypeAccordionName,
            holdingsTypes[0].name,
          );
          cy.wait('@getInstances1', { timeout: 10_000 }).then(() => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.holdingsTypeAccordionName,
              holdingsTypes[0].name,
              1,
            );
            InventoryInstances.checkSearchResultCount('^1 record');
            InventoryInstances.selectInstance();
            InventoryInstance.waitInventoryLoading();
            InventoryInstance.openHoldingView();
            HoldingsRecordView.checkHoldingsType(holdingsTypes[0].name);
            HoldingsRecordView.close();
            InventoryInstance.waitInventoryLoading();
            InventorySearchAndFilter.toggleAccordionByName(testData.holdingsTypeAccordionName);

            cy.intercept('/search/instances*').as('getInstances2');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              testData.holdingsTypeAccordionName,
              holdingsTypes[1].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.holdingsTypeAccordionName,
              holdingsTypes[0].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.holdingsTypeAccordionName,
              holdingsTypes[1].name,
            );
            cy.wait('@getInstances2', { timeout: 10_000 }).then(() => {
              InventoryInstances.checkSearchResultCount('^3 records');
              InventoryInstances.selectInstance(2);
              InventoryInstance.waitInventoryLoading();
              InventoryInstance.openHoldingView();
              HoldingsRecordView.checkHoldingsType(
                or(holdingsTypes[0].name, holdingsTypes[1].name),
              );
              HoldingsRecordView.close();
              InventoryInstance.waitInventoryLoading();
              InventorySearchAndFilter.toggleAccordionByName(testData.holdingsTypeAccordionName);

              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                testData.holdingsTypeAccordionName,
                holdingsTypes[0].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.holdingsTypeAccordionName,
                holdingsTypes[0].name,
                false,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.holdingsTypeAccordionName,
                holdingsTypes[1].name,
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then(() => {
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  testData.holdingsTypeAccordionName,
                  holdingsTypes[1].name,
                  2,
                );
                InventoryInstances.checkSearchResultCount('^2 records');
                InventorySearchAndFilter.clearFilter(testData.holdingsTypeAccordionName);
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.holdingsTypeAccordionName,
                  holdingsTypes[1].name,
                  false,
                );
                InventorySearchAndFilter.verifyResultPaneEmpty();

                cy.intercept('/search/instances*').as('getInstancesQuery');
                InventoryInstances.searchByTitle(testData.instancesTitlePrefix);
                cy.wait('@getInstancesQuery', { timeout: 10_000 });

                cy.intercept('/search/instances*').as('getInstances4');
                InventorySearchAndFilter.selectMultiSelectFilterOption(
                  testData.holdingsTypeAccordionName,
                  holdingsTypes[2].name,
                );
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.holdingsTypeAccordionName,
                  holdingsTypes[2].name,
                );
                cy.wait('@getInstances4', { timeout: 10_000 }).then(() => {
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                    testData.holdingsTypeAccordionName,
                    holdingsTypes[2].name,
                    1,
                  );
                  InventoryInstances.checkSearchResultCount('^1 record');
                  InventoryInstances.selectInstance();
                  InventoryInstance.waitInventoryLoading();
                  InventoryInstance.openHoldingView();
                  HoldingsRecordView.checkHoldingsType(holdingsTypes[2].name);
                  HoldingsRecordView.close();
                  InventoryInstance.waitInventoryLoading();
                  InventorySearchAndFilter.toggleAccordionByName(
                    testData.holdingsTypeAccordionName,
                  );

                  InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                    testData.holdingsTypeAccordionName,
                    holdingsTypes[3].name,
                    true,
                    1,
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.holdingsTypeAccordionName,
                    holdingsTypes[3].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.holdingsTypeAccordionName,
                    holdingsTypes[2].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.holdingsTypeAccordionName,
                    holdingsTypes[3].name,
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.holdingsTypeAccordionName,
                    holdingsTypes[2].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.holdingsTypeAccordionName,
                    holdingsTypes[2].name,
                    false,
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.holdingsTypeAccordionName,
                    holdingsTypes[3].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.holdingsTypeAccordionName,
                    holdingsTypes[3].name,
                    false,
                  );
                  InventoryInstances.checkSearchResultCount('^6 records');
                  InventorySearchAndFilter.verifyNumberOfSearchResults(6);
                });
                InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                  testData.holdingsTypeAccordionName,
                  '6753',
                  holdingsTypes[0].name,
                );
              });
            });
          });
        },
      );
    });
  });
});
