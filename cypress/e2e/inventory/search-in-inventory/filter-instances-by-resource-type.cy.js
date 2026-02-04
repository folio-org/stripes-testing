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
        instancesTitlePrefix: `C476721 ${getRandomPostfix()}`,
        resourceTypeAccordionName: 'Resource type',
      };
      const createdRecordIDs = [];
      let instanceTypes;
      let resourceTypeForTypeAhead;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;

          cy.getInstanceTypes({ limit: 200 })
            .then((types) => {
              instanceTypes = types.filter((item) => item.source === 'rdacontent');

              const resourceType = instanceTypes[0];
              resourceTypeForTypeAhead = {
                notFullValue: resourceType.name.slice(3),
                fullValue: resourceType.name,
              };
            })
            .then(() => {
              for (let i = 0; i <= 10; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: instanceTypes[i].id,
                    title: `${testData.instancesTitlePrefix} ${i}`,
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
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476721 Filter "Instance" records by "Resource Type" filter/facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476721'] },
        () => {
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
          });
          InventorySearchAndFilter.toggleAccordionByName(testData.resourceTypeAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.resourceTypeAccordionName,
          );
          cy.intercept('/search/instances*').as('getInstances1');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.resourceTypeAccordionName,
            instanceTypes[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.resourceTypeAccordionName,
            instanceTypes[0].name,
          );
          cy.wait('@getInstances1', { timeout: 10_000 }).then((instances1) => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.resourceTypeAccordionName,
              instanceTypes[0].name,
              instances1.response.body.totalRecords,
            );
            InventoryInstances.checkSearchResultCount(
              '^' + instances1.response.body.totalRecords.toLocaleString('en-US') + ' record',
            );
            InventoryInstances.selectInstance();
            InventoryInstance.waitInventoryLoading();
            InstanceRecordView.verifyResourceType(instanceTypes[0].name);

            cy.intercept('/search/instances*').as('getInstances2');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              testData.resourceTypeAccordionName,
              instanceTypes[1].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.resourceTypeAccordionName,
              instanceTypes[0].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.resourceTypeAccordionName,
              instanceTypes[1].name,
            );
            cy.wait('@getInstances2', { timeout: 10_000 }).then((instances2) => {
              InventoryInstances.checkSearchResultCount(
                '^' + instances2.response.body.totalRecords.toLocaleString('en-US') + ' record',
              );
              InventoryInstances.selectInstance(1);
              InventoryInstance.waitInventoryLoading();
              InstanceRecordView.verifyResourceType(
                or(instanceTypes[0].name, instanceTypes[1].name),
              );

              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                testData.resourceTypeAccordionName,
                instanceTypes[0].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.resourceTypeAccordionName,
                instanceTypes[0].name,
                false,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.resourceTypeAccordionName,
                instanceTypes[1].name,
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then((instances3) => {
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  testData.resourceTypeAccordionName,
                  instanceTypes[1].name,
                  instances3.response.body.totalRecords,
                );
                InventoryInstances.checkSearchResultCount(
                  '^' + instances3.response.body.totalRecords.toLocaleString('en-US') + ' record',
                );
                InventoryInstances.selectInstance();
                InventoryInstance.waitInventoryLoading();
                InstanceRecordView.verifyResourceType(instanceTypes[1].name);
                InventorySearchAndFilter.clearFilter(testData.resourceTypeAccordionName);
                cy.ifConsortia(true, () => {
                  InventorySearchAndFilter.clearFilter('Shared');
                });
                InventorySearchAndFilter.verifyResultPaneEmpty();

                cy.ifConsortia(true, () => {
                  InventorySearchAndFilter.toggleAccordionByName('Shared', false);
                  InventorySearchAndFilter.byShared('No');
                });
                cy.intercept('/search/instances*').as('getInstancesQuery');
                InventoryInstances.searchByTitle(testData.instancesTitlePrefix);
                cy.wait('@getInstancesQuery', { timeout: 10_000 });

                cy.intercept('/search/instances*').as('getInstances4');
                InventorySearchAndFilter.selectMultiSelectFilterOption(
                  testData.resourceTypeAccordionName,
                  instanceTypes[5].name,
                );
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.resourceTypeAccordionName,
                  instanceTypes[5].name,
                );
                cy.wait('@getInstances4', { timeout: 10_000 }).then((instances4) => {
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                    testData.resourceTypeAccordionName,
                    instanceTypes[5].name,
                    instances4.response.body.totalRecords,
                  );
                  InventoryInstances.checkSearchResultCount(
                    '^' + instances4.response.body.totalRecords.toLocaleString('en-US') + ' record',
                  );
                  InventoryInstances.selectInstance();
                  InventoryInstance.waitInventoryLoading();
                  InstanceRecordView.verifyResourceType(instanceTypes[5].name);

                  InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                    testData.resourceTypeAccordionName,
                    instanceTypes[3].name,
                    true,
                    1,
                  );
                  cy.intercept('/search/instances*').as('getInstances5');
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.resourceTypeAccordionName,
                    instanceTypes[3].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.resourceTypeAccordionName,
                    instanceTypes[5].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.resourceTypeAccordionName,
                    instanceTypes[3].name,
                  );
                  cy.wait('@getInstances5', { timeout: 10_000 }).then((instances5) => {
                    InventoryInstances.checkSearchResultCount(
                      '^' +
                        instances5.response.body.totalRecords.toLocaleString('en-US') +
                        ' record',
                    );
                  });

                  InventorySearchAndFilter.clearFilter(testData.resourceTypeAccordionName);
                  InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                    testData.resourceTypeAccordionName,
                    resourceTypeForTypeAhead.notFullValue,
                    resourceTypeForTypeAhead.fullValue,
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
