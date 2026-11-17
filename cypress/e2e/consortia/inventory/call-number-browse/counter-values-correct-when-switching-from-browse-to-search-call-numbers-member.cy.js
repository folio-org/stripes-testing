import {
  BROWSE_CALL_NUMBER_OPTIONS,
  INVENTORY_SEARCH_INSTANCE_FILTERS_MEMBER,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const instancePrefix = `AT_C466216_FolioInstance_${randomPostfix}`;
      // The TestRail precondition: 3 Shared instances (Central) and 1 Local instance (Member)
      const instanceTitles = {
        shared1: `${instancePrefix}_Shared_1`,
        shared2: `${instancePrefix}_Shared_2`,
        shared3: `${instancePrefix}_Shared_3`,
        local: `${instancePrefix}_Local`,
      };
      // A unique value instead of "UIIN-2859 cn test": the 2 Shared instances and the Local one
      // share it, Shared instance 3 has the same words in a different order - a different
      // string, so it must not be counted in the exact-match row
      const callNumberValue = `AT_C466216 cn test ${randomLetters}`;
      const reorderedCallNumberValue = `test cn AT_C466216 ${randomLetters}`;
      const querySearchOption = 'Query search';
      const searchQuery = `itemFullCallNumbers="${callNumberValue}"`;
      const operatorText = 'itemFullCallNumbers="';
      const searchFilters = INVENTORY_SEARCH_INSTANCE_FILTERS_MEMBER;
      const staffSuppressAccordionName = searchFilters.STAFF_SUPPRESS;
      // Facets with counters: the date accordions have no counters
      const accordionsWithoutCounters = [
        searchFilters.DATE_RANGE,
        searchFilters.DATE_CREATED,
        searchFilters.DATE_UPDATED,
      ];
      const facetAccordionNames = Object.values(searchFilters).filter(
        (accordionName) => !accordionsWithoutCounters.includes(accordionName),
      );
      const foundRecordsCount = 3;
      const testData = { central: {}, member: {} };

      const getFirstReferenceDataId = (path, collectionName) => {
        return cy
          .okapiRequest({
            path,
            searchParams: { limit: 1 },
            isDefaultSearchParamsRequired: false,
          })
          .then(({ body }) => body[collectionName][0].id);
      };

      // Reference data of the current tenant for the optional instance fields: each facet gets
      // options, so the sum of the counters can be compared with the number of records
      const getInstanceReferenceData = (target) => {
        cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
          target.instanceTypeId = instanceTypes[0].id;
        });
        getFirstReferenceDataId('instance-formats', 'instanceFormats').then((id) => {
          target.instanceFormatId = id;
        });
        getFirstReferenceDataId('nature-of-content-terms', 'natureOfContentTerms').then((id) => {
          target.natureOfContentTermId = id;
        });
        getFirstReferenceDataId('instance-statuses', 'instanceStatuses').then((id) => {
          target.instanceStatusId = id;
        });
        cy.getModesOfIssuance({ limit: 1 }).then((modeOfIssuance) => {
          target.modeOfIssuanceId = modeOfIssuance.id;
        });
        cy.getStatisticalCodes({ limit: 1 }).then((statisticalCodes) => {
          target.statisticalCodeId = statisticalCodes[0].id;
        });
      };

      const createInstance = (title, referenceData) => {
        return InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title,
            instanceTypeId: referenceData.instanceTypeId,
            languages: ['eng'],
            instanceFormatIds: [referenceData.instanceFormatId],
            natureOfContentTermIds: [referenceData.natureOfContentTermId],
            statisticalCodeIds: [referenceData.statisticalCodeId],
            modeOfIssuanceId: referenceData.modeOfIssuanceId,
            statusId: referenceData.instanceStatusId,
            tags: { tagList: [`AT_C466216_Tag_${randomLetters}`] },
          },
        });
      };

      before('Create test data and user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        [Affiliations.College, Affiliations.Consortia].forEach((affiliation) => {
          cy.withinTenant(affiliation, () => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('C466216_');
          });
        });

        cy.then(() => {
          cy.resetTenant();
          getInstanceReferenceData(testData.central);

          // Reference data of the Member tenant for the Local instance, holdings and items
          cy.setTenant(Affiliations.College);
          getInstanceReferenceData(testData.member);
          cy.getLocations({ limit: 1, query: 'name<>"AT_*" and name<>"*auto*"' }).then(
            (location) => {
              testData.location = location;
            },
          );
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            testData.loanTypeId = loanTypes[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source<>local' }).then((materialType) => {
            testData.materialTypeId = materialType.id;
          });
        })
          .then(() => {
            // Shared instances: created in Central
            cy.resetTenant();
            createInstance(instanceTitles.shared1, testData.central).then((createdInstance) => {
              testData.shared1Id = createdInstance.instanceId;
            });
            createInstance(instanceTitles.shared2, testData.central).then((createdInstance) => {
              testData.shared2Id = createdInstance.instanceId;
            });
            createInstance(instanceTitles.shared3, testData.central).then((createdInstance) => {
              testData.shared3Id = createdInstance.instanceId;
            });

            // Local instance: created in Member
            cy.setTenant(Affiliations.College);
            createInstance(instanceTitles.local, testData.member).then((createdInstance) => {
              testData.localId = createdInstance.instanceId;
            });
          })
          .then(() => {
            // Holdings in the Member tenant for each instance, items with the call numbers
            cy.setTenant(Affiliations.College);
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              [
                { instanceId: testData.shared1Id, callNumber: callNumberValue },
                { instanceId: testData.shared2Id, callNumber: callNumberValue },
                { instanceId: testData.shared3Id, callNumber: reorderedCallNumberValue },
                { instanceId: testData.localId, callNumber: callNumberValue },
              ].forEach(({ instanceId, callNumber }) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId,
                  permanentLocationId: testData.location.id,
                  sourceId: folioSource.id,
                }).then((createdHoldings) => {
                  InventoryItems.createItemViaApi({
                    holdingsRecordId: createdHoldings.id,
                    materialType: { id: testData.materialTypeId },
                    permanentLoanType: { id: testData.loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    itemLevelCallNumber: callNumber,
                  });
                });
              });
            });
          })
          .then(() => {
            // The user is created in Member (primary affiliation) - the test starts there;
            // Shared instances are visible from Member without Central permissions
            cy.setTenant(Affiliations.College);
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.enableStaffSuppressFacet.gui,
            ]).then((userProperties) => {
              testData.user = userProperties;
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      after('Delete user and data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        // The Local instance and the Member holdings and items of the shared instances
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        Users.deleteViaApi(testData.user.userId);

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
      });

      it(
        'C466216 Counter values are correct when switching from Browse by Call numbers to "Search" tab in Member tenant (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C466216'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.getToken(testData.user.username, testData.user.password);

          // The browse index is not updated immediately: wait until the exact call number
          // is counted for all 3 instances
          BrowseCallNumber.waitForCallNumberToAppear(
            callNumberValue,
            true,
            undefined,
            foundRecordsCount,
          );

          // Step 1: browse "Call numbers (all)" for the call number - exact match, 3 titles
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.browseSearch(callNumberValue);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValue, `${foundRecordsCount}`);

          // Step 2-3: "DevTools" is simulated by intercepting the search and facets requests;
          // click the exact match - Query search with the call number, 3 records found
          const facetResponses = [];
          cy.intercept('GET', '/search/instances/facets?*', (request) => {
            request.continue((response) => {
              facetResponses.push({
                url: decodeURIComponent(request.url).replace(/\+/g, ' '),
                facets: response.body?.facets || {},
              });
            });
          });
          const searchAlias = InventorySearchAndFilter.interceptInstancesSearch();
          BrowseCallNumber.clickOnResult(callNumberValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, searchQuery);
          InventorySearchAndFilter.verifyNumberOfSearchResults(foundRecordsCount);
          InventoryInstances.checkSearchResultCount(
            new RegExp(`${foundRecordsCount} records found`),
          );
          InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared1);
          InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared2);
          InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local);

          // Step 4: the instances request uses the "=" operator with the call number
          cy.wait(`@${searchAlias}`).then((interception) => {
            const decodedUrl = decodeURIComponent(interception.request.url).replace(/\+/g, ' ');

            expect(decodedUrl).to.include(operatorText);
            expect(decodedUrl).to.include(callNumberValue);
          });

          // Step 5: "Staff suppress" facet - none of the records is suppressed, so the only
          // option is "No" with the counter 3 (it is not preselected in this release)
          InventorySearchAndFilter.expandAccordion(staffSuppressAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            staffSuppressAccordionName,
            'No',
            false,
          );
          InventorySearchAndFilter.verifyFilterOptionCount(
            staffSuppressAccordionName,
            'No',
            foundRecordsCount,
          );

          // Step 7: expand all other accordions with facets
          facetAccordionNames
            .filter((accordionName) => accordionName !== staffSuppressAccordionName)
            .forEach((accordionName) => {
              InventorySearchAndFilter.expandAccordion(accordionName);
            });

          // Step 6-7: each facets request (incl. "Staff suppress") uses the "=" operator with
          // the call number, and the sum of the counters of each facet is equal to the number
          // of the found records
          cy.wrap(facetResponses).should((responses) => {
            expect(responses.length, 'facets requests').to.be.greaterThan(0);
            const staffSuppressRequests = responses.filter(({ facets }) => {
              return Object.keys(facets).includes('staffSuppress');
            });

            expect(staffSuppressRequests.length, 'staff suppress facet requests').to.be.greaterThan(
              0,
            );
            responses.forEach(({ url, facets }) => {
              expect(url).to.include(operatorText);
              expect(url).to.include(callNumberValue);
              Object.entries(facets).forEach(([facetName, facet]) => {
                const countersSum = (facet.values || []).reduce(
                  (sum, option) => sum + option.totalRecords,
                  0,
                );

                expect(countersSum, `sum of the counters of "${facetName}"`).to.equal(
                  foundRecordsCount,
                );
              });
            });
          });

          // Step 8: Reset all - search box and results are cleared, option is "Keyword"
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.searchTypeDropdownDefaultValue(searchInstancesOptions[0]);
        },
      );
    });
  });
});
