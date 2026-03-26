import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Index management', () => {
      describe('Consortia', () => {
        const totalInstances = 50;
        const batchSize = 10;
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C1009050_FolioInstance_${randomPostfix}`;
        const heldByAccordionName = 'Held by';

        const instanceTitles = Array.from(
          { length: totalInstances },
          (_, i) => `${instancePrefix} ${i + 1}`,
        );
        const instanceData = [];
        let user;
        let memberLocation;
        let holdingsSourceId;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.createTempUser([Permissions.inventoryAll.gui])
            .then((userProperties) => {
              user = userProperties;
              cy.assignAffiliationToUser(Affiliations.College, user.userId);

              cy.setTenant(Affiliations.College);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C1009050');
              cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);

              cy.resetTenant();
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C1009050');
            })
            .then(() => {
              // #1 Create 50 shared instances on Central tenant
              cy.resetTenant();
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  instanceTitles.forEach((title, index) => {
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId: instanceTypes[0].id,
                        title,
                      },
                    }).then((createdInstance) => {
                      instanceData[index] = { instanceId: createdInstance.instanceId };
                    });
                  });
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
              }).then((res) => {
                memberLocation = res;
              });
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                holdingsSourceId = folioSource.id;
              });
            })
            .then(() => {
              // #2 Login to Central tenant
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
          Users.deleteViaApi(user.userId);
        });

        it(
          'C1009050 Verify that 50 holdings created individually are successfully indexed (spitfire) (TaaS)',
          { tags: ['criticalPathECS', 'spitfire', 'C1009050'] },
          () => {
            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(totalInstances);

            // #2-3 Search for all created instances in Member tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(totalInstances);

            // #4-6 Create holdings in batches of 10 and verify indexing after each batch
            function createBatchAndVerify(batch) {
              const startIdx = batch * batchSize;
              const endIdx = startIdx + batchSize;
              const expectedCount = endIdx;

              // Create 10 holdings via API
              cy.then(() => {
                cy.setTenant(Affiliations.College);
                for (let i = startIdx; i < endIdx; i++) {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceData[i].instanceId,
                    permanentLocationId: memberLocation.id,
                    sourceId: holdingsSourceId,
                  }).then((createdHolding) => {
                    instanceData[i].holdingsHrid = createdHolding.hrid;
                  });
                }
              }).then(() => {
                // Verify "Held by" counter
                InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
                InventoryInstances.waitContentLoading();
                InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
                InventorySearchAndFilter.clickSearch();
                InventorySearchAndFilter.verifyNumberOfSearchResults(totalInstances);

                InventorySearchAndFilter.toggleAccordionByName(heldByAccordionName);
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  heldByAccordionName,
                  tenantNames.college,
                  expectedCount,
                );
                InventorySearchAndFilter.toggleAccordionByName(heldByAccordionName, false);

                // Verify HRID searchability for first and last holdings in the batch
                [startIdx, endIdx - 1].forEach((i) => {
                  InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
                  InventoryInstances.waitContentLoading();
                  InventorySearchAndFilter.searchHoldingsByHRID(instanceData[i].holdingsHrid);
                  InventorySearchAndFilter.verifySearchResult(instanceTitles[i]);
                  InventorySearchAndFilter.verifyNumberOfSearchResults(1);
                  InventoryInstance.waitLoading();
                });
              });
            }

            const numberOfBatches = totalInstances / batchSize;

            for (let batch = 0; batch < numberOfBatches; batch++) {
              createBatchAndVerify(batch);
            }
          },
        );
      });
    });
  });
});
