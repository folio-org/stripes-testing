import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Formats from '../../../support/fragments/settings/inventory/instances/formats';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const testData = {
        instancesTitlePrefix: `AT_C476722_FolioInstance_${randomPostfix}`,
        formatAccordionName: 'Format',
        formatPrefix: `AT_C476722_${randomLetters}`,
        codePrefix: `uf_${randomLetters}`,
        source: 'local',
        valuesDistribution: [[0], [1, 2, 3], [2, 3], [1, 2]],
      };
      const getRecordsCount = (formatIndexes) => {
        return testData.valuesDistribution.filter((recordIndexes) => formatIndexes.some((idx) => recordIndexes.includes(idx))).length;
      };
      const createdRecordIDs = [];
      const instanceFormats = [];
      let instanceTypeId;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        Formats.getViaApi({ limit: 200 }).then((formats) => {
          formats.forEach((format) => {
            if (format.name.includes('C476722')) {
              Formats.deleteViaApi(format.id);
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
              Formats.createViaApi({
                name: `${testData.formatPrefix}_${i} -- term_${i}`,
                code: `${testData.codePrefix}_${i}`,
                source: testData.source,
              }).then((response) => {
                instanceFormats.push({
                  ...response.body,
                  category: response.body.name.split(' -- ')[0],
                  term: response.body.name.split(' -- ')[1],
                });
              });
            }
          })
            .then(() => {
              for (let i = 0; i < 4; i++) {
                const instanceFormatIds = testData.valuesDistribution[i].map(
                  (el) => instanceFormats[el].id,
                );
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${i}`,
                    instanceFormatIds,
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
        instanceFormats.forEach((format) => {
          Formats.deleteViaApi(format.id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476722 Filter "Instance" records by "Format" filter/facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476722'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(testData.formatAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.formatAccordionName,
          );
          cy.intercept('/search/instances*').as('getInstances1');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.formatAccordionName,
            instanceFormats[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.formatAccordionName,
            instanceFormats[0].name,
          );
          cy.wait('@getInstances1', { timeout: 10_000 }).then(() => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.formatAccordionName,
              instanceFormats[0].name,
              1,
            );
            InventoryInstances.checkSearchResultCount(`^${getRecordsCount([0])} record`);
            InventoryInstances.selectInstance();
            InventoryInstance.waitInventoryLoading();
            InstanceRecordView.verifyInstanceFormat(
              instanceFormats[0].category,
              instanceFormats[0].term,
            );

            cy.intercept('/search/instances*').as('getInstances2');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              testData.formatAccordionName,
              instanceFormats[1].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.formatAccordionName,
              instanceFormats[0].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.formatAccordionName,
              instanceFormats[1].name,
            );
            cy.wait('@getInstances2', { timeout: 10_000 }).then(() => {
              InventoryInstances.checkSearchResultCount(`^${getRecordsCount([0, 1])} record`);
              InventoryInstances.selectInstanceById(createdRecordIDs[3]);
              InventoryInstance.waitInventoryLoading();
              InstanceRecordView.verifyInstanceFormat(
                instanceFormats[1].category,
                instanceFormats[1].term,
              );
              InstanceRecordView.verifyInstanceFormat(
                instanceFormats[2].category,
                instanceFormats[2].term,
              );

              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                testData.formatAccordionName,
                instanceFormats[0].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.formatAccordionName,
                instanceFormats[0].name,
                false,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.formatAccordionName,
                instanceFormats[1].name,
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then(() => {
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  testData.formatAccordionName,
                  instanceFormats[1].name,
                  2,
                );
                InventoryInstances.checkSearchResultCount(`^${getRecordsCount([1])} record`);
                InventorySearchAndFilter.clearFilter(testData.formatAccordionName);
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.formatAccordionName,
                  instanceFormats[1].name,
                  false,
                );
                InventorySearchAndFilter.verifyResultPaneEmpty();

                cy.intercept('/search/instances*').as('getInstancesQuery');
                InventoryInstances.searchByTitle(testData.instancesTitlePrefix);
                cy.wait('@getInstancesQuery', { timeout: 10_000 });

                cy.intercept('/search/instances*').as('getInstances4');
                InventorySearchAndFilter.selectMultiSelectFilterOption(
                  testData.formatAccordionName,
                  instanceFormats[2].name,
                );
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.formatAccordionName,
                  instanceFormats[2].name,
                );
                cy.wait('@getInstances4', { timeout: 10_000 }).then(() => {
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                    testData.formatAccordionName,
                    instanceFormats[2].name,
                    3,
                  );
                  InventoryInstances.checkSearchResultCount(`^${getRecordsCount([2])} record`);
                  InventoryInstances.selectInstance(1);
                  InventoryInstance.waitInventoryLoading();
                  InstanceRecordView.verifyInstanceFormat(
                    instanceFormats[2].category,
                    instanceFormats[2].term,
                  );

                  InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                    testData.formatAccordionName,
                    instanceFormats[3].name,
                    true,
                    1,
                  );
                  cy.intercept('/search/instances*').as('getInstances5');
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.formatAccordionName,
                    instanceFormats[3].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.formatAccordionName,
                    instanceFormats[2].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.formatAccordionName,
                    instanceFormats[3].name,
                  );
                  cy.wait('@getInstances5', { timeout: 10_000 }).then(() => {
                    InventoryInstances.checkSearchResultCount(`^${getRecordsCount([2, 3])} record`);
                  });
                  InventorySearchAndFilter.clearFilter(testData.formatAccordionName);
                  InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                    testData.formatAccordionName,
                    '6722',
                    instanceFormats[0].name,
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
