import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { or } from '../../../../interactors';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import StatisticalCodes from '../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const testData = {
        instancesTitlePrefix: `AT_C476754_FolioInstance_${randomPostfix}`,
        statisticalCodeAccordionName: 'Statistical code',
        statisticalCodePrefix: `AT_C476754_${randomLetters}`,
        source: 'local',
        valuesDistribution: [[0, 1], [2], [1, 3], [0, 1, 3]],
      };
      const getRecordsCount = (codeIndexes) => {
        return testData.valuesDistribution.filter((recordIndexes) => codeIndexes.some((idx) => recordIndexes.includes(idx))).length;
      };
      const statisticalCodes = [];
      let instanceTypeId;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        cy.getStatisticalCodes({ limit: 200 }).then((codes) => {
          codes.forEach((code) => {
            if (code.name.includes('C476754')) {
              StatisticalCodes.deleteViaApi(code.id);
            }
          });
        });
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
          (createdUserProperties) => {
            user = createdUserProperties;
            cy.then(() => {
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((types) => {
                instanceTypeId = types[0].id;
              });
              cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
                testData.holdingTypeId = res[0].id;
              });
              cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
                (res) => {
                  testData.locationId = res.id;
                },
              );
              cy.getStatisticalCodeTypes({ limit: 1, query: 'source=folio' }).then((codeTypes) => {
                testData.statisticalCodeType = codeTypes[0];

                for (let i = 0; i < 4; i++) {
                  StatisticalCodes.createViaApi({
                    name: `${testData.statisticalCodePrefix}_${i}`,
                    source: testData.source,
                    code: `usc_${randomLetters}_${i}`,
                    statisticalCodeTypeId: testData.statisticalCodeType.id,
                  }).then((code) => {
                    const uiOptionName = `${testData.statisticalCodeType.name}: ${code.code} - ${code.name}`;
                    statisticalCodes.push({ ...code, uiOptionName });
                  });
                }
              });
            })
              .then(() => {
                for (let i = 0; i < 4; i++) {
                  const statisticalCodeIds = testData.valuesDistribution[i].map(
                    (el) => statisticalCodes[el].id,
                  );
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: `${testData.instancesTitlePrefix}_${i}`,
                    },
                    holdings: [
                      {
                        holdingsTypeId: testData.holdingTypeId,
                        permanentLocationId: testData.locationId,
                        statisticalCodeIds,
                      },
                    ],
                  });
                }
              })
              .then(() => {
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
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
        statisticalCodes.forEach((code) => {
          StatisticalCodes.deleteViaApi(code.id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476754 Filter "Instance" records by Holdings "Statistical code" facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476754'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(testData.statisticalCodeAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.statisticalCodeAccordionName,
          );
          cy.intercept('/search/instances*').as('getInstances1');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.statisticalCodeAccordionName,
            statisticalCodes[0].uiOptionName,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.statisticalCodeAccordionName,
            statisticalCodes[0].uiOptionName,
          );
          cy.wait('@getInstances1', { timeout: 10_000 }).then(() => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.statisticalCodeAccordionName,
              statisticalCodes[0].uiOptionName,
              getRecordsCount([0]),
            );
            InventoryInstances.checkSearchResultCount(`^${getRecordsCount([0])} record`);
            InventoryInstances.selectInstance();
            InventoryInstance.waitInventoryLoading();
            InventoryInstance.openHoldingView();
            HoldingsRecordView.checkStatisticalCode(statisticalCodes[0].name);
            HoldingsRecordView.close();
            InventoryInstance.waitInventoryLoading();
            InventorySearchAndFilter.toggleAccordionByName(testData.statisticalCodeAccordionName);

            cy.intercept('/search/instances*').as('getInstances2');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              testData.statisticalCodeAccordionName,
              statisticalCodes[1].uiOptionName,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.statisticalCodeAccordionName,
              statisticalCodes[0].uiOptionName,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.statisticalCodeAccordionName,
              statisticalCodes[1].uiOptionName,
            );
            cy.wait('@getInstances2', { timeout: 10_000 }).then(() => {
              InventoryInstances.checkSearchResultCount(`^${getRecordsCount([0, 1])} record`);
              InventoryInstances.selectInstance(2);
              InventoryInstance.waitInventoryLoading();
              InventoryInstance.openHoldingView();
              HoldingsRecordView.checkStatisticalCode(
                or(statisticalCodes[0].name, statisticalCodes[1].name),
              );
              HoldingsRecordView.close();
              InventoryInstance.waitInventoryLoading();
              InventorySearchAndFilter.toggleAccordionByName(testData.statisticalCodeAccordionName);

              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                testData.statisticalCodeAccordionName,
                statisticalCodes[0].uiOptionName,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.statisticalCodeAccordionName,
                statisticalCodes[0].uiOptionName,
                false,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.statisticalCodeAccordionName,
                statisticalCodes[1].uiOptionName,
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then(() => {
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  testData.statisticalCodeAccordionName,
                  statisticalCodes[1].uiOptionName,
                  getRecordsCount([1]),
                );
                InventoryInstances.checkSearchResultCount(`^${getRecordsCount([1])} record`);
                InventorySearchAndFilter.clearFilter(testData.statisticalCodeAccordionName);
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.statisticalCodeAccordionName,
                  statisticalCodes[1].uiOptionName,
                  false,
                );
                InventorySearchAndFilter.verifyResultPaneEmpty();

                cy.intercept('/search/instances*').as('getInstancesQuery');
                InventoryInstances.searchByTitle(testData.instancesTitlePrefix);
                cy.wait('@getInstancesQuery', { timeout: 10_000 });

                cy.intercept('/search/instances*').as('getInstances4');
                InventorySearchAndFilter.selectMultiSelectFilterOption(
                  testData.statisticalCodeAccordionName,
                  statisticalCodes[2].uiOptionName,
                );
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.statisticalCodeAccordionName,
                  statisticalCodes[2].uiOptionName,
                );
                cy.wait('@getInstances4', { timeout: 10_000 }).then(() => {
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[2].uiOptionName,
                    getRecordsCount([2]),
                  );
                  InventoryInstances.checkSearchResultCount(`^${getRecordsCount([2])} record`);
                  InventoryInstances.selectInstance();
                  InventoryInstance.waitInventoryLoading();
                  InventoryInstance.openHoldingView();
                  HoldingsRecordView.checkStatisticalCode(statisticalCodes[2].name);
                  HoldingsRecordView.close();
                  InventoryInstance.waitInventoryLoading();
                  InventorySearchAndFilter.toggleAccordionByName(
                    testData.statisticalCodeAccordionName,
                  );

                  InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[3].uiOptionName,
                    true,
                    1,
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[3].uiOptionName,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[2].uiOptionName,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[3].uiOptionName,
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[2].uiOptionName,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[2].uiOptionName,
                    false,
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[3].uiOptionName,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[3].uiOptionName,
                    false,
                  );
                  InventoryInstances.checkSearchResultCount(
                    `^${testData.valuesDistribution.length} record`,
                  );
                  InventorySearchAndFilter.verifyNumberOfSearchResults(
                    testData.valuesDistribution.length,
                  );
                  InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                    testData.statisticalCodeAccordionName,
                    '76754',
                    statisticalCodes[0].uiOptionName,
                  );
                });
              });
            });
          });
        },
      );
    });
  });
});
