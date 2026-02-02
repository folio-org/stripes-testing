import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import { or, including } from '../../../../interactors';
import NatureOfContent from '../../../support/fragments/settings/inventory/instances/natureOfContent';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const testData = {
        instancesTitlePrefix: `AT_C476726_FolioInstance_${randomPostfix}`,
        natureOfContentAccordionName: 'Nature of content',
        natureOfContentPrefix: `AT_C476726_${randomLetters}`,
        natureOfContentSouce: 'local',
        valuesDistribution: [[0, 1], [2], [1, 3], [0, 1, 3]],
      };
      const getRecordsCount = (natureOfContentIndexes) => {
        return testData.valuesDistribution.filter((recordIndexes) => natureOfContentIndexes.some((idx) => recordIndexes.includes(idx))).length;
      };
      const createdRecordIDs = [];
      const naturesOfContent = [];
      let instanceTypeId;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        NatureOfContent.getViaApi({ limit: 2 }).then(({ natureOfContentTerms }) => {
          natureOfContentTerms.forEach((item) => {
            if (item.name.includes('C476726')) {
              NatureOfContent.deleteViaApi(item.id);
            }
          });
        });
        cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.then(() => {
            cy.getInstanceTypes({ limit: 200 }).then((types) => {
              instanceTypeId = types.filter((item) => item.source === 'rdacontent')[0].id;
            });
            for (let i = 0; i < 4; i++) {
              NatureOfContent.createViaApi({
                name: `${testData.natureOfContentPrefix}_${i}`,
                source: testData.natureOfContentSouce,
              }).then(({ body }) => {
                naturesOfContent.push(body);
              });
            }
          })
            .then(() => {
              for (let i = 0; i < 4; i++) {
                const natureOfContentTermIds = testData.valuesDistribution[i].map(
                  (el) => naturesOfContent[el].id,
                );
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${i}`,
                    natureOfContentTermIds,
                  },
                }).then((instance) => {
                  createdRecordIDs.push(instance.instanceId);
                });
              }
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              InventorySearchAndFilter.instanceTabIsDefault();
            });
        });
      });

      after('Delete user, test data', () => {
        cy.getAdminToken();
        createdRecordIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        naturesOfContent.forEach((item) => {
          NatureOfContent.deleteViaApi(item.id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476726 Filter "Instance" records by "Nature of content" filter/facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476726'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(testData.natureOfContentAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.natureOfContentAccordionName,
          );
          cy.intercept('/search/instances*').as('getInstances1');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.natureOfContentAccordionName,
            naturesOfContent[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.natureOfContentAccordionName,
            naturesOfContent[0].name,
          );
          cy.wait('@getInstances1', { timeout: 10_000 }).then(() => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.natureOfContentAccordionName,
              naturesOfContent[0].name,
              getRecordsCount([0]),
            );
            InventoryInstances.checkSearchResultCount(`^${getRecordsCount([0])} record`);
            InventoryInstances.selectInstance();
            InventoryInstance.waitInventoryLoading();
            InstanceRecordView.verifyNatureOfContent(including(naturesOfContent[0].name));

            cy.intercept('/search/instances*').as('getInstances2');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              testData.natureOfContentAccordionName,
              naturesOfContent[1].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.natureOfContentAccordionName,
              naturesOfContent[0].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.natureOfContentAccordionName,
              naturesOfContent[1].name,
            );
            cy.wait('@getInstances2', { timeout: 10_000 }).then(() => {
              InventoryInstances.checkSearchResultCount(`^${getRecordsCount([0, 1])} record`);
              InventoryInstances.selectInstance(1);
              InventoryInstance.waitInventoryLoading();
              InstanceRecordView.verifyNatureOfContent(
                or(including(naturesOfContent[0].name), including(naturesOfContent[1].name)),
              );

              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                testData.natureOfContentAccordionName,
                naturesOfContent[0].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.natureOfContentAccordionName,
                naturesOfContent[0].name,
                false,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.natureOfContentAccordionName,
                naturesOfContent[1].name,
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then(() => {
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  testData.natureOfContentAccordionName,
                  naturesOfContent[1].name,
                  getRecordsCount([1]),
                );
                InventoryInstances.checkSearchResultCount(`^${getRecordsCount([1])} record`);
                InventorySearchAndFilter.clearFilter(testData.natureOfContentAccordionName);
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.natureOfContentAccordionName,
                  naturesOfContent[1].name,
                  false,
                );
                InventorySearchAndFilter.verifyResultPaneEmpty();

                cy.intercept('/search/instances*').as('getInstancesQuery');
                InventoryInstances.searchByTitle(testData.instancesTitlePrefix);
                cy.wait('@getInstancesQuery', { timeout: 10_000 });

                cy.intercept('/search/instances*').as('getInstances4');
                InventorySearchAndFilter.selectMultiSelectFilterOption(
                  testData.natureOfContentAccordionName,
                  naturesOfContent[2].name,
                );
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.natureOfContentAccordionName,
                  naturesOfContent[2].name,
                );
                cy.wait('@getInstances4', { timeout: 10_000 }).then(() => {
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                    testData.natureOfContentAccordionName,
                    naturesOfContent[2].name,
                    getRecordsCount([2]),
                  );
                  InventoryInstances.checkSearchResultCount(`^${getRecordsCount([2])} record`);
                  InventoryInstances.selectInstance();
                  InventoryInstance.waitInventoryLoading();
                  InstanceRecordView.verifyNatureOfContent(including(naturesOfContent[2].name));

                  InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                    testData.natureOfContentAccordionName,
                    naturesOfContent[3].name,
                    true,
                    1,
                  );
                  cy.intercept('/search/instances*').as('getInstances5');
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.natureOfContentAccordionName,
                    naturesOfContent[3].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.natureOfContentAccordionName,
                    naturesOfContent[2].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.natureOfContentAccordionName,
                    naturesOfContent[3].name,
                  );
                  cy.wait('@getInstances5', { timeout: 10_000 }).then(() => {
                    InventoryInstances.checkSearchResultCount(`^${getRecordsCount([2, 3])} record`);
                  });
                  InventorySearchAndFilter.clearFilter(testData.natureOfContentAccordionName);
                  InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                    testData.natureOfContentAccordionName,
                    '76726',
                    naturesOfContent[0].name,
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
