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
        const instancePrefix = `AT_C584552_Instance_${randomPostfix}`;
        const sharedAccordionName = 'Shared';
        const heldbyAccordionName = 'Held by';
        const instancesData = [
          {
            affiliation: Affiliations.Consortia,
            date1: '1900',
            holdingsAffiliations: [],
          },
          {
            affiliation: Affiliations.Consortia,
            date1: '1901',
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.Consortia,
            date1: '1902',
            holdingsAffiliations: [Affiliations.University],
          },
          {
            affiliation: Affiliations.Consortia,
            date1: '1903',
            holdingsAffiliations: [Affiliations.College, Affiliations.University],
          },
          {
            affiliation: Affiliations.College,
            date1: '1904',
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.College,
            date1: '1905',
            holdingsAffiliations: [],
          },
          {
            affiliation: Affiliations.University,
            date1: '1906',
            holdingsAffiliations: [Affiliations.University],
          },
          {
            affiliation: Affiliations.College,
            date1: '1907',
            holdingsAffiliations: [Affiliations.College],
          },
        ];
        const dates = instancesData.map((instanceData) => instanceData.date1);
        const dateResults = [
          [...dates.slice(0, 6), dates.at(-1)],
          dates.slice(1, 6),
          dates.slice(2, 4),
          [dates[1], dates[3], dates[4]],
          [dates[1], dates[3]],
          [dates[4]],
        ];
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const allVisibleInstanceIndexes = instancesData
          .map((record, index) => ({ record, index }))
          .filter(({ record }) => record.affiliation !== Affiliations.University)
          .map(({ index }) => index);

        let user;
        let member1Location;
        let member2Location;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;

              cy.resetTenant();
              cy.assignAffiliationToUser(Affiliations.University, user.userId);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);

              cy.setTenant(Affiliations.College);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C584552');
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                member1Location = res;
              });

              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C584552');
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                member2Location = res;
              });
            })
            .then(() => {
              cy.resetTenant();
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C584552');

              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  instancesData.forEach((instanceData, index) => {
                    cy.setTenant(instanceData.affiliation);

                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId: instanceTypes[0].id,
                        title: `${instanceTitles[index]}`,
                        dates: { date1: instanceData.date1 },
                      },
                    }).then((createdInstanceData) => {
                      instanceData.instanceId = createdInstanceData.instanceId;
                    });
                  });
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                instancesData.forEach((instanceData) => {
                  instanceData.holdingsAffiliations.forEach((affiliation) => {
                    cy.setTenant(affiliation);
                    const location =
                      affiliation === Affiliations.College ? member1Location : member2Location;
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instanceData.instanceId,
                      permanentLocationId: location.id,
                      sourceId: folioSource.id,
                    });
                  });
                });
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        });

        it(
          'C584552 Filter "Instance" records by combination of filters "Date range" + "Shared" + "Held by" (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C584552'] },
          () => {
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            InventorySearchAndFilter.clickAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(heldbyAccordionName, true);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );

            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(allVisibleInstanceIndexes.length);
            allVisibleInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            dateResults[0].forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });

            InventorySearchAndFilter.filterByDateRange(dates[1], dates[6]);
            InventorySearchAndFilter.verifyNumberOfSearchResults(dateResults[1].length);
            dateResults[1].forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });

            InventorySearchAndFilter.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              true,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(dateResults[2].length);
            dateResults[2].forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });

            InventorySearchAndFilter.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(dateResults[1].length);
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.college,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(dateResults[3].length);
            dateResults[3].forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });

            InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
            InventorySearchAndFilter.verifyNumberOfSearchResults(dateResults[4].length);
            dateResults[4].forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sharedAccordionName,
              'Yes',
              false,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(dateResults[3].length);
            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
            InventorySearchAndFilter.verifyNumberOfSearchResults(dateResults[5].length);
            dateResults[5].forEach((date) => {
              InventorySearchAndFilter.verifyResultWithDate1Found(date);
            });
          },
        );
      });
    });
  });
});
