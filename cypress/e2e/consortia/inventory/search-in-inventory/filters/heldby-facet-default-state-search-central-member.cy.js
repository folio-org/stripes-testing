import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C844199_FolioInstance_${randomPostfix}`;
        const heldByAccordionName = 'Held by';

        const instancesData = [
          {
            hasHoldings: true,
            affiliation: Affiliations.Consortia,
          },
          {
            hasHoldings: false,
            affiliation: Affiliations.Consortia,
          },
          {
            hasHoldings: true,
            affiliation: Affiliations.College,
          },
          {
            hasHoldings: false,
            affiliation: Affiliations.College,
          },
        ];
        instancesData.forEach((instance) => {
          instance.itemHrids = [];
        });
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const expectedMemberInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.hasHoldings === true)
          .map(({ index }) => index);
        const notExpectedMemberInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.hasHoldings !== true)
          .map(({ index }) => index);
        const expectedCentralInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.Consortia)
          .map(({ index }) => index);
        const notExpectedCentralInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.Consortia)
          .map(({ index }) => index);
        let user;
        let location;
        let holdingsSourceId;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C844199');

          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;

              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C844199');

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
            })
            .then(() => {
              cy.resetTenant();
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  instancesData.forEach((instanceData, index) => {
                    cy.setTenant(instanceData.affiliation);

                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId: instanceTypes[0].id,
                        title: `${instanceTitles[index]}`,
                      },
                    }).then((createdInstanceData) => {
                      instanceData.instanceId = createdInstanceData.instanceId;
                    });
                  });
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                location = res;
              });
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                holdingsSourceId = folioSource.id;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              instancesData.forEach((instanceData) => {
                if (instanceData.hasHoldings) {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceData.instanceId,
                    permanentLocationId: location.id,
                    sourceId: holdingsSourceId,
                  });
                }
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              InventorySearchAndFilter.instanceTabIsDefault();
              InventorySearchAndFilter.validateSearchTabIsDefault();
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.resetTenant();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        });

        it(
          'C844199 Check default state of "Held by" facet after switching affiliation to Central/Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C844199'] },
          () => {
            function searchAndCheckHeldBy(isMember = true) {
              const expectedIndexes = isMember
                ? expectedMemberInstanceIndexes
                : expectedCentralInstanceIndexes;
              const notExpectedIndexes = isMember
                ? notExpectedMemberInstanceIndexes
                : notExpectedCentralInstanceIndexes;

              InventorySearchAndFilter.toggleAccordionByName(heldByAccordionName);
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                heldByAccordionName,
                tenantNames.college,
                isMember,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                heldByAccordionName,
                tenantNames.central,
                false,
              );

              InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
              InventorySearchAndFilter.clickSearch();
              expectedIndexes.forEach((instanceIndex) => {
                InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
              });
              notExpectedIndexes.forEach((instanceIndex) => {
                InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex], false);
              });
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                heldByAccordionName,
                tenantNames.college,
                isMember,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                heldByAccordionName,
                tenantNames.central,
                false,
              );
            }

            searchAndCheckHeldBy(true);

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();

            searchAndCheckHeldBy(true);

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();

            searchAndCheckHeldBy(true);

            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.checkSearchQueryText('');
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldByAccordionName,
              tenantNames.college,
              true,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldByAccordionName,
              tenantNames.central,
              false,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            InventoryInstances.waitContentLoading();

            searchAndCheckHeldBy(false);

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();

            searchAndCheckHeldBy(false);

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();

            searchAndCheckHeldBy(false);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();

            searchAndCheckHeldBy(true);
          },
        );
      });
    });
  });
});
