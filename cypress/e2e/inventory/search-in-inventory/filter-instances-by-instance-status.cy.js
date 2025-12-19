import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import { or } from '../../../../interactors';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const testData = {
        instancesTitlePrefix: `AT_C476732_FolioInstance_${randomPostfix}`,
        instanceStatusAccordionName: 'Instance status',
        instanceStatusPrefix: `AT_C476732_${randomLetters}`,
        codePrefix: `ut_${randomLetters}`,
        instanceStatusSource: 'local',
      };
      const createdRecordIDs = [];
      const instanceStatuses = [];
      let instanceTypeId;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        InstanceStatusTypes.getViaApi({ limit: 200 }).then((types) => {
          types.forEach((type) => {
            if (type.name.includes('C476732')) {
              InstanceStatusTypes.deleteViaApi(type.id);
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
              InstanceStatusTypes.createViaApi({
                name: `${testData.instanceStatusPrefix}_${i}`,
                code: `${testData.codePrefix}_${i}`,
                source: testData.instanceStatusSource,
              }).then((response) => {
                instanceStatuses.push(response.body);
              });
            }
          })
            .then(() => {
              for (let i = 0; i < 4; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${i}`,
                    statusId: instanceStatuses[i].id,
                  },
                }).then((instance) => {
                  createdRecordIDs.push(instance.instanceId);
                });
              }
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: `${testData.instancesTitlePrefix}_${4}`,
                  statusId: instanceStatuses[0].id,
                },
              }).then((instance) => {
                createdRecordIDs.push(instance.instanceId);
              });
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: `${testData.instancesTitlePrefix}_${5}`,
                  statusId: instanceStatuses[2].id,
                },
              }).then((instance) => {
                createdRecordIDs.push(instance.instanceId);
              });
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
        instanceStatuses.forEach((type) => {
          InstanceStatusTypes.deleteViaApi(type.id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476732 Filter "Instance" records by "Instance status" filter/facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476732'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(testData.instanceStatusAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.instanceStatusAccordionName,
          );
          cy.intercept('/search/instances*').as('getInstances1');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.instanceStatusAccordionName,
            instanceStatuses[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.instanceStatusAccordionName,
            instanceStatuses[0].name,
          );
          cy.wait('@getInstances1', { timeout: 10_000 }).then(() => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.instanceStatusAccordionName,
              instanceStatuses[0].name,
              2,
            );
            InventoryInstances.checkSearchResultCount('^2 records');
            InventoryInstances.selectInstance();
            InventoryInstance.waitInventoryLoading();
            InstanceRecordView.verifyInstanceStatusTerm(instanceStatuses[0].name);

            cy.intercept('/search/instances*').as('getInstances2');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              testData.instanceStatusAccordionName,
              instanceStatuses[1].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.instanceStatusAccordionName,
              instanceStatuses[0].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.instanceStatusAccordionName,
              instanceStatuses[1].name,
            );
            cy.wait('@getInstances2', { timeout: 10_000 }).then(() => {
              InventoryInstances.checkSearchResultCount('^3 records');
              InventoryInstances.selectInstance(2);
              InventoryInstance.waitInventoryLoading();
              InstanceRecordView.verifyInstanceStatusTerm(
                or(instanceStatuses[0].name, instanceStatuses[1].name),
              );

              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                testData.instanceStatusAccordionName,
                instanceStatuses[0].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.instanceStatusAccordionName,
                instanceStatuses[0].name,
                false,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.instanceStatusAccordionName,
                instanceStatuses[1].name,
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then(() => {
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  testData.instanceStatusAccordionName,
                  instanceStatuses[1].name,
                  1,
                );
                InventoryInstances.checkSearchResultCount('^1 record');
                InventorySearchAndFilter.clearFilter(testData.instanceStatusAccordionName);
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.instanceStatusAccordionName,
                  instanceStatuses[1].name,
                  false,
                );
                InventorySearchAndFilter.verifyResultPaneEmpty();

                cy.intercept('/search/instances*').as('getInstancesQuery');
                InventoryInstances.searchByTitle(testData.instancesTitlePrefix);
                cy.wait('@getInstancesQuery', { timeout: 10_000 });

                cy.intercept('/search/instances*').as('getInstances4');
                InventorySearchAndFilter.selectMultiSelectFilterOption(
                  testData.instanceStatusAccordionName,
                  instanceStatuses[2].name,
                );
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.instanceStatusAccordionName,
                  instanceStatuses[2].name,
                );
                cy.wait('@getInstances4', { timeout: 10_000 }).then(() => {
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                    testData.instanceStatusAccordionName,
                    instanceStatuses[2].name,
                    2,
                  );
                  InventoryInstances.checkSearchResultCount('^2 records');
                  InventoryInstances.selectInstance(1);
                  InventoryInstance.waitInventoryLoading();
                  InstanceRecordView.verifyInstanceStatusTerm(instanceStatuses[2].name);

                  InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                    testData.instanceStatusAccordionName,
                    instanceStatuses[3].name,
                    true,
                    1,
                  );
                  cy.intercept('/search/instances*').as('getInstances5');
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.instanceStatusAccordionName,
                    instanceStatuses[3].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.instanceStatusAccordionName,
                    instanceStatuses[2].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.instanceStatusAccordionName,
                    instanceStatuses[3].name,
                  );
                  cy.wait('@getInstances5', { timeout: 10_000 }).then(() => {
                    InventoryInstances.checkSearchResultCount('^3 records');
                  });
                  InventorySearchAndFilter.clearFilter(testData.instanceStatusAccordionName);
                  InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                    testData.instanceStatusAccordionName,
                    '76732',
                    instanceStatuses[0].name,
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
