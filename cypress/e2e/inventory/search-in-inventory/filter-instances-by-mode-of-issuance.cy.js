import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import { or } from '../../../../interactors';
import NewInstanceHoldingItem from '../../../support/fragments/inventory/holdingsMove/defaultInstanceHoldingItem';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const testData = {
        instancesTitlePrefix: `AT_C476725_FolioInstance_${randomPostfix}`,
        modeOfIssuanceAccordionName: 'Mode of issuance',
        modeOfIssuancePrefix: `AT_C476725_${randomLetters}`,
        modeOfIssuanceSouce: NewInstanceHoldingItem.defaultModesOfIssuans.body.source,
      };
      const createdRecordIDs = [];
      const modesOfIssuance = [];
      let instanceTypeId;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        cy.getAllModesOfIssuance({ limit: 200 }).then((codes) => {
          codes.forEach((code) => {
            if (code.name.includes('C476725')) {
              cy.deleteModesOfIssuans(code.id);
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
              cy.createModesOfIssuans({
                name: `${testData.modeOfIssuancePrefix}_${i}`,
                source: testData.modeOfIssuanceSouce,
              }).then((mode) => {
                modesOfIssuance.push(mode);
              });
            }
          })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: `${testData.instancesTitlePrefix}_0`,
                  modeOfIssuanceId: modesOfIssuance[0].id,
                },
              }).then((instance) => {
                createdRecordIDs.push(instance.instanceId);
              });
              for (let i = 1; i < 3; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${i}`,
                    modeOfIssuanceId: modesOfIssuance[1].id,
                  },
                }).then((instance) => {
                  createdRecordIDs.push(instance.instanceId);
                });
              }
              for (let i = 3; i < 6; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${i}`,
                    modeOfIssuanceId: modesOfIssuance[2].id,
                  },
                }).then((instance) => {
                  createdRecordIDs.push(instance.instanceId);
                });
              }
              for (let i = 6; i < 8; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${i}`,
                    modeOfIssuanceId: modesOfIssuance[3].id,
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
        modesOfIssuance.forEach((mode) => {
          cy.deleteModesOfIssuans(mode.id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476725 Filter "Instance" records by "Mode of issuance" filter/facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476725'] },
        () => {
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
          });
          InventorySearchAndFilter.toggleAccordionByName(testData.modeOfIssuanceAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.modeOfIssuanceAccordionName,
          );
          cy.intercept('/search/instances*').as('getInstances1');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.modeOfIssuanceAccordionName,
            modesOfIssuance[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.modeOfIssuanceAccordionName,
            modesOfIssuance[0].name,
          );
          cy.wait('@getInstances1', { timeout: 10_000 }).then(() => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.modeOfIssuanceAccordionName,
              modesOfIssuance[0].name,
              1,
            );
            InventoryInstances.checkSearchResultCount('^1 record');
            InventoryInstances.selectInstance();
            InventoryInstance.waitInventoryLoading();
            InstanceRecordView.verifyModeOfIssuance(modesOfIssuance[0].name);

            cy.intercept('/search/instances*').as('getInstances2');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              testData.modeOfIssuanceAccordionName,
              modesOfIssuance[1].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.modeOfIssuanceAccordionName,
              modesOfIssuance[0].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.modeOfIssuanceAccordionName,
              modesOfIssuance[1].name,
            );
            cy.wait('@getInstances2', { timeout: 10_000 }).then(() => {
              InventoryInstances.checkSearchResultCount('^3 records');
              InventoryInstances.selectInstance(1);
              InventoryInstance.waitInventoryLoading();
              InstanceRecordView.verifyModeOfIssuance(
                or(modesOfIssuance[0].name, modesOfIssuance[1].name),
              );

              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                testData.modeOfIssuanceAccordionName,
                modesOfIssuance[0].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.modeOfIssuanceAccordionName,
                modesOfIssuance[0].name,
                false,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.modeOfIssuanceAccordionName,
                modesOfIssuance[1].name,
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then(() => {
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  testData.modeOfIssuanceAccordionName,
                  modesOfIssuance[1].name,
                  2,
                );
                InventoryInstances.checkSearchResultCount('^2 records');
                InventorySearchAndFilter.clearFilter(testData.modeOfIssuanceAccordionName);
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.modeOfIssuanceAccordionName,
                  modesOfIssuance[1].name,
                  false,
                );
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
                  testData.modeOfIssuanceAccordionName,
                  modesOfIssuance[2].name,
                );
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.modeOfIssuanceAccordionName,
                  modesOfIssuance[2].name,
                );
                cy.wait('@getInstances4', { timeout: 10_000 }).then(() => {
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                    testData.modeOfIssuanceAccordionName,
                    modesOfIssuance[2].name,
                    3,
                  );
                  InventoryInstances.checkSearchResultCount('^3 records');
                  InventoryInstances.selectInstance(2);
                  InventoryInstance.waitInventoryLoading();
                  InstanceRecordView.verifyModeOfIssuance(modesOfIssuance[2].name);

                  InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                    testData.modeOfIssuanceAccordionName,
                    modesOfIssuance[3].name,
                    true,
                    1,
                  );
                  cy.intercept('/search/instances*').as('getInstances5');
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.modeOfIssuanceAccordionName,
                    modesOfIssuance[3].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.modeOfIssuanceAccordionName,
                    modesOfIssuance[2].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.modeOfIssuanceAccordionName,
                    modesOfIssuance[3].name,
                  );
                  cy.wait('@getInstances5', { timeout: 10_000 }).then(() => {
                    InventoryInstances.checkSearchResultCount('^5 records');
                  });
                  InventorySearchAndFilter.clearFilter(testData.modeOfIssuanceAccordionName);
                  InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                    testData.modeOfIssuanceAccordionName,
                    '6725',
                    modesOfIssuance[0].name,
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
