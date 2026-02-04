import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import { or } from '../../../../interactors';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const testData = {
        instancesTitlePrefix: `C476730 ${getRandomPostfix()}`,
        statisticalCodeAccordionName: 'Statistical code',
      };
      const createdRecordIDs = [];
      let instanceTypeId;
      let statisticalCodes;
      let statisticalCodeTypes;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.then(() => {
            cy.getInstanceTypes({ limit: 200 }).then((types) => {
              instanceTypeId = types.filter((item) => item.source === 'rdacontent')[0].id;
            });
            cy.getStatisticalCodes({ limit: 200 }).then((codes) => {
              statisticalCodes = codes.filter((item) => item.source !== 'local');
            });
            cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
              statisticalCodeTypes = codeTypes.filter((item) => item.source === 'folio');
            });
          })
            .then(() => {
              const codesWithUiNames = [];
              statisticalCodes.forEach((code) => {
                const codeType = statisticalCodeTypes.find(
                  (type) => type.id === code.statisticalCodeTypeId,
                );
                if (codeType) {
                  codesWithUiNames.push({
                    ...code,
                    uiOptionName: `${codeType.name}: ${code.code} - ${code.name}`,
                  });
                }
              });
              statisticalCodes = codesWithUiNames;

              for (let i = 0; i <= 10; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix} ${i}`,
                    statisticalCodeIds: [statisticalCodes[i].id],
                  },
                }).then((instance) => {
                  createdRecordIDs.push(instance.instanceId);
                });
              }
              statisticalCodes.forEach((code, index) => {
                statisticalCodes[index].uiOptionName =
                  `${statisticalCodeTypes.filter((type) => type.id === code.statisticalCodeTypeId)[0].name}: ${code.code} - ${code.name}`;
              });

              const fullValue = statisticalCodes[0].uiOptionName;
              testData.statCodeForTypeAhead = {
                notFullValue: fullValue.slice(3),
                fullValue,
              };
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              InventorySearchAndFilter.instanceTabIsDefault();
              cy.ifConsortia(true, () => {
                InventorySearchAndFilter.byShared('No');
              });
            });
        });
      });

      after('Delete user, test data', () => {
        cy.getAdminToken();
        createdRecordIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476730 Filter "Instance" records by "Statistical code" filter/facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476730'] },
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
          cy.wait('@getInstances1', { timeout: 10_000 }).then((instances1) => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.statisticalCodeAccordionName,
              statisticalCodes[0].uiOptionName,
              instances1.response.body.totalRecords,
            );
            InventoryInstances.checkSearchResultCount(
              '^' + instances1.response.body.totalRecords.toLocaleString('en-US') + ' record',
            );
            InventoryInstances.selectInstance();
            InventoryInstance.waitInventoryLoading();
            InstanceRecordView.verifyStatisticalCode(statisticalCodes[0].name);

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
            cy.wait('@getInstances2', { timeout: 10_000 }).then((instances2) => {
              InventoryInstances.checkSearchResultCount(
                '^' + instances2.response.body.totalRecords.toLocaleString('en-US') + ' record',
              );
              InventoryInstances.selectInstance(1);
              InventoryInstance.waitInventoryLoading();
              InstanceRecordView.verifyStatisticalCode(
                or(statisticalCodes[0].name, statisticalCodes[1].name),
              );

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
              cy.wait('@getInstances3', { timeout: 10_000 }).then((instances3) => {
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  testData.statisticalCodeAccordionName,
                  statisticalCodes[1].uiOptionName,
                  instances3.response.body.totalRecords,
                );
                InventoryInstances.checkSearchResultCount(
                  '^' + instances3.response.body.totalRecords.toLocaleString('en-US') + ' record',
                );
                InventoryInstances.selectInstance();
                InventoryInstance.waitInventoryLoading();
                InstanceRecordView.verifyStatisticalCode(statisticalCodes[1].name);
                InventorySearchAndFilter.clearFilter(testData.statisticalCodeAccordionName);

                cy.intercept('/search/instances*').as('getInstancesQuery');
                InventoryInstances.searchByTitle(testData.instancesTitlePrefix);
                cy.wait('@getInstancesQuery', { timeout: 10_000 });

                cy.intercept('/search/instances*').as('getInstances4');
                InventorySearchAndFilter.selectMultiSelectFilterOption(
                  testData.statisticalCodeAccordionName,
                  statisticalCodes[5].uiOptionName,
                );
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.statisticalCodeAccordionName,
                  statisticalCodes[5].uiOptionName,
                );
                cy.wait('@getInstances4', { timeout: 10_000 }).then((instances4) => {
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[5].uiOptionName,
                    instances4.response.body.totalRecords,
                  );
                  InventoryInstances.checkSearchResultCount(
                    '^' + instances4.response.body.totalRecords.toLocaleString('en-US') + ' record',
                  );
                  InventoryInstances.selectInstance();
                  InventoryInstance.waitInventoryLoading();
                  InstanceRecordView.verifyStatisticalCode(statisticalCodes[5].name);

                  InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[3].uiOptionName,
                    true,
                    1,
                  );
                  cy.intercept('/search/instances*').as('getInstances5');
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[3].uiOptionName,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[5].uiOptionName,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.statisticalCodeAccordionName,
                    statisticalCodes[3].uiOptionName,
                  );
                  cy.wait('@getInstances5', { timeout: 10_000 }).then((instances5) => {
                    InventoryInstances.checkSearchResultCount(
                      '^' +
                        instances5.response.body.totalRecords.toLocaleString('en-US') +
                        ' record',
                    );
                  });
                  InventorySearchAndFilter.clearFilter(testData.statisticalCodeAccordionName);
                  InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                    testData.statisticalCodeAccordionName,
                    testData.statCodeForTypeAhead.notFullValue,
                    testData.statCodeForTypeAhead.fullValue,
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
