import uuid from 'uuid';
import { INSTANCE_SOURCE_NAMES, INVENTORY_COLUMN_HEADERS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import HoldingsSources from '../../../support/fragments/settings/inventory/holdings/holdingsSources';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const pageSize = 100;
    // All three tabs (Instance, Holdings, Items) show INSTANCE records in the results list, so
    // 101 kept + 1 other-type = 102 plain instances give 2 pages on every tab:
    //   Instance tab with facet → 101 kept → 2 pages (100+1); before facet → 102 → 2 pages
    //   Holdings and Items tabs (title search) → 102 → 2 pages
    // Each instance has 1 holding only because the Holdings tab's "Suppress from discovery"
    // facet (step 12) is holdings-level and would drop instances without holdings. No items are
    // needed - no Items-tab filter is used.
    const keptCount = pageSize + 1; // 101
    const padNumber = (n) => String(n).padStart(3, '0');
    const randomPostfix = getRandomPostfix();
    const titlePrefix = `AT_C398017_FolioInstance_${randomPostfix}`;
    const contributorBase = `AT_C398017_Contributor_${randomPostfix}`;
    const sourceAccordionName = 'Source';
    const resourceTypeAccordionName = 'Resource type';
    const suppressDiscoveryAccordionName = 'Suppress from discovery';

    // 101 kept + 1 other-type = 102 instances, each with 1 holding
    const keptInstances = Array.from({ length: keptCount }, (_, i) => ({
      id: uuid(),
      holdingId: uuid(),
      title: `${titlePrefix}_${padNumber(i + 1)}`,
      contributor: `${contributorBase}_${padNumber(i + 1)}`,
    }));
    const otherTypeInstance = {
      id: uuid(),
      holdingId: uuid(),
      title: `${titlePrefix}_${padNumber(0)}`,
      contributor: `${contributorBase}_${padNumber(0)}`,
    };
    const allInstances = [otherTypeInstance, ...keptInstances];

    const lastKeptInstance = keptInstances[keptCount - 1];
    // Different records are opened on different tabs (the app mixes up the remembered record
    // otherwise). Instance tab: a record from the middle of the filtered page 1 (Contributors asc,
    // _001 is row 0). Items tab: the last record of page 2 (Title asc, _100 and _101)
    const instanceTabRecord = keptInstances[pageSize / 2 - 1];
    // const instanceTabRecordRow = pageSize / 2 - 1;
    const itemTabRecord = lastKeptInstance;
    // const itemTabRecordRow = 1;

    // Page 1 of filtered Instance result (101 kept instances, sorted Contributors ascending)
    const filteredPage1 = keptInstances.slice(0, pageSize);

    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      // Mutiple passes to remove leftovers from previous runs (each handles ≤ 100 instances)
      InventoryInstances.deleteFullInstancesByTitleViaApi('C398017_');
      cy.getAdminToken(false);
      InventoryInstances.deleteFullInstancesByTitleViaApi('C398017_');
      cy.getAdminToken(false);

      cy.then(() => {
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"autotest*")',
        }).then(() => {
          testData.location = Cypress.env('locations')[0];
        });
        HoldingsSources.getHoldingsSourcesViaApi({ query: 'name="folio"' }).then((sources) => {
          testData.holdingsSourceId = sources[0].id;
        });
        cy.getInstanceTypes({ limit: 2, query: 'source<>local' }).then((instanceTypes) => {
          testData.keptInstanceTypeId = instanceTypes[0].id;
          testData.keptInstanceTypeName = instanceTypes[0].name;
          testData.otherInstanceTypeId = instanceTypes[1].id;
        });
        BrowseContributors.getContributorNameTypes().then((types) => {
          testData.contributorNameTypeId = types[0].id;
        });
      })
        .then(() => {
          const instancesToCreate = [
            { ...otherTypeInstance, instanceTypeId: testData.otherInstanceTypeId },
            ...keptInstances.map((inst) => ({
              ...inst,
              instanceTypeId: testData.keptInstanceTypeId,
            })),
          ].map(({ id, title, contributor, instanceTypeId }) => ({
            id,
            title,
            source: INSTANCE_SOURCE_NAMES.FOLIO,
            instanceTypeId,
            contributors: [
              {
                name: contributor,
                contributorNameTypeId: testData.contributorNameTypeId,
                contributorTypeText: '',
                primary: false,
              },
            ],
          }));
          cy.batchUpdateInstancesViaApi(instancesToCreate).then((response) => {
            expect(response.status).to.eq(201);
          });
        })
        .then(() => {
          const holdingsToCreate = allInstances.map(({ id: instanceId, holdingId }) => ({
            id: holdingId,
            instanceId,
            permanentLocationId: testData.location.id,
            sourceId: testData.holdingsSourceId,
          }));
          cy.batchUpdateHoldingsViaApi(holdingsToCreate);
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.window().then((win) => win.sessionStorage.clear());
      // Split 102 deletes into 2 batches; refresh token before each to avoid 401s mid-cleanup
      const batchSize = Math.ceil(allInstances.length / 2);
      [0, 1].forEach((i) => {
        cy.getAdminToken(false);
        allInstances
          .slice(i * batchSize, (i + 1) * batchSize)
          .forEach(({ id }) => InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id));
      });
      Users.deleteViaApi(testData.user?.userId);
    });

    // Commented checks will FAIL until this is fixed: https://folio-org.atlassian.net/browse/UIIN-3725
    it(
      'C398017 Switch between "Instance", "Holdings", "Item" doesn\'t clear "Inventory" pane (promin)',
      { tags: ['extendedPath', 'promin', 'C398017'] },
      () => {
        // Verifies the full Instance tab state is preserved after switching away and back (steps 17 and 21)
        const verifyInstanceTabState = () => {
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.checkSearchQueryText(titlePrefix);
          // Contributors ascending sort, still on page 1 of filtered 101 results
          InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, true);
          InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(true);
          InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(false);
          // Page 1: first kept instance present; other-type (filtered out) and last kept (page 2) absent
          InventorySearchAndFilter.verifySearchResult(filteredPage1[0].title, true);
          InventorySearchAndFilter.verifySearchResult(otherTypeInstance.title, false);
          InventorySearchAndFilter.verifySearchResult(lastKeptInstance.title, false);
          // Both columns hidden by steps 4 and 11 survive tab switching
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.RELATION,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            false,
          );
          // Detail view closed; the record opened in step 7 highlighted; all checkboxes unchecked
          InventorySearchAndFilter.verifyInstanceDetailsViewAbsent();
          InventorySearchAndFilter.verifySearchResult(instanceTabRecord.title, true);
          // Uncomment when UIIN-3725 is fixed:
          // InventoryInstances.verifyRowIsHighlighted(instanceTabRecordRow);
          InventoryInstances.verifySelectAllInstancesCheckbox(false);
          InventoryInstances.verifyAllCheckboxesAreChecked(false);
          // Facet accordions are collapsed after switching tabs - expand them to verify selections persist
          InventorySearchAndFilter.verifyAccordionByNameExpanded(sourceAccordionName, false);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(resourceTypeAccordionName, false);
          InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            sourceAccordionName,
            INSTANCE_SOURCE_NAMES.FOLIO,
            true,
          );
          InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            resourceTypeAccordionName,
            testData.keptInstanceTypeName,
          );
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            resourceTypeAccordionName,
            1,
          );
        };

        // Verifies the full Holdings tab state is preserved after switching away and back (step 18)
        const verifyHoldingsTabState = () => {
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventorySearchAndFilter.checkSearchQueryText(titlePrefix);
          // Title descending sort, page 1 of 102: _101 first, _001/_000 on page 2
          InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.TITLE, false);
          InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(true);
          InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(false);
          InventorySearchAndFilter.verifySearchResult(lastKeptInstance.title, true);
          InventorySearchAndFilter.verifySearchResult(keptInstances[0].title, false);
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.RELATION,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            false,
          );
          InventoryInstances.verifySelectAllInstancesCheckbox(false);
          // Suppress from discovery accordion collapsed after switching - expand and verify selection
          InventorySearchAndFilter.verifyAccordionByNameExpanded(
            suppressDiscoveryAccordionName,
            false,
          );
          InventorySearchAndFilter.toggleAccordionByName(suppressDiscoveryAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            suppressDiscoveryAccordionName,
            'No',
            true,
          );
        };

        // Verifies the full Items tab state is preserved after switching away and back (step 19)
        const verifyItemsTabState = () => {
          InventorySearchAndFilter.itemTabIsDefault();
          InventorySearchAndFilter.checkSearchQueryText(titlePrefix);
          // Title ascending sort (default), on page 2 of 102 instances (_100, _101)
          InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.TITLE, true);
          InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(false);
          InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(true);
          // Page 2: _100 and _101; page 1 instances absent
          InventorySearchAndFilter.verifySearchResult(keptInstances[pageSize - 1].title, true);
          InventorySearchAndFilter.verifySearchResult(lastKeptInstance.title, true);
          InventorySearchAndFilter.verifySearchResult(keptInstances[0].title, false);
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.RELATION,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            false,
          );
          // Row opened in step 16 is highlighted; all checkboxes unchecked
          // Uncomment when UIIN-3725 is fixed:
          // InventoryInstances.verifyRowIsHighlighted(itemTabRecordRow);
          InventoryInstances.verifySelectAllInstancesCheckbox(false);
        };

        // Step 1: Search Instances by own title prefix → 202 results, page 1 (100 visible)
        InventoryInstances.searchByTitle(titlePrefix);
        InventoryInstances.checkSearchResultCount(`${allInstances.length} records found`);
        InventorySearchAndFilter.checkRowsCount(pageSize);

        // Step 2: Sort by Contributors ascending; page 1 of 3 (202 total)
        InventoryInstances.clickColumnHeader(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, true);
        InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(true);
        InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(false);

        // Step 3: Go to page 2 of 2; Next disabled (last page, 2 instances with contributors
        // _100 and _101, i.e. titles _050 and _101)
        InventorySearchAndFilter.clickListInventoryNextPaginationButton();
        InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, true);
        InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(false);
        InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(true);
        InventorySearchAndFilter.verifySearchResult(keptInstances[pageSize - 1].title, true);
        InventorySearchAndFilter.verifySearchResult(lastKeptInstance.title, true);
        InventorySearchAndFilter.verifySearchResult(keptInstances[0].title, false);
        InventorySearchAndFilter.verifySearchResult(instanceTabRecord.title, false);

        // Step 4: Hide "Relation" column via Actions > Show columns
        InventoryInstances.clickActionsButton();
        InventorySearchAndFilter.toggleShowColumnCheckbox(INVENTORY_COLUMN_HEADERS.RELATION, false);
        InventorySearchAndFilter.validateSearchTableColumnsShown(
          INVENTORY_COLUMN_HEADERS.RELATION,
          false,
        );

        // Step 5: Apply Source = FOLIO and Resource type = keptInstanceType facets
        // Filtering out the other-type instance leaves 101 results; search resets to page 1
        InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
        InventorySearchAndFilter.selectOptionInExpandedFilter(
          sourceAccordionName,
          INSTANCE_SOURCE_NAMES.FOLIO,
        );
        InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          resourceTypeAccordionName,
          testData.keptInstanceTypeName,
        );
        InventoryInstances.checkSearchResultCount(`${keptInstances.length} records found`);
        InventorySearchAndFilter.checkRowsCount(filteredPage1.length);
        InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(true);
        InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(false);
        InventorySearchAndFilter.verifySearchResult(filteredPage1[0].title, true);
        InventorySearchAndFilter.verifySearchResult(otherTypeInstance.title, false);

        // Step 6: Select all records with the header checkbox
        InventoryInstances.clickSelectAllInstancesCheckbox();
        InventoryInstances.verifySelectAllInstancesCheckbox(true);

        // Step 7: Scroll down and open an Instance record from the middle of page 1 (_050)
        InventoryInstances.selectInstanceByTitle(instanceTabRecord.title);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.checkInstanceTitle(instanceTabRecord.title);

        // Step 8: Switch to Holdings tab; verify Instance pane is cleared
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.checkSearchQueryText('');
        InventorySearchAndFilter.verifyInstanceDetailsViewAbsent();

        // Step 9: Search Holdings by titlePrefix; verify Relation column hidden, Title sort, no selections
        InventoryInstances.searchByTitle(titlePrefix);
        InventoryInstances.checkSearchResultCount(`${allInstances.length} records found`);
        InventorySearchAndFilter.checkRowsCount(pageSize);
        InventorySearchAndFilter.validateSearchTableColumnsShown(
          INVENTORY_COLUMN_HEADERS.RELATION,
          false,
        );
        InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.TITLE, true);
        InventoryInstances.verifySelectAllInstancesCheckbox(false);

        // Step 10: Sort by Title descending; page 1 starts at _101, _001/_000 are on page 2
        InventoryInstances.clickColumnHeader(INVENTORY_COLUMN_HEADERS.TITLE);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.TITLE, false);
        InventorySearchAndFilter.verifySearchResult(lastKeptInstance.title, true);
        InventorySearchAndFilter.verifySearchResult(keptInstances[0].title, false);

        // Step 11: Hide "Publishers" column
        InventoryInstances.clickActionsButton();
        InventorySearchAndFilter.toggleShowColumnCheckbox(
          INVENTORY_COLUMN_HEADERS.PUBLISHERS,
          false,
        );
        InventorySearchAndFilter.validateSearchTableColumnsShown(
          INVENTORY_COLUMN_HEADERS.PUBLISHERS,
          false,
        );

        // Step 12: Apply Suppress from discovery = No facet; verify still on page 1
        InventorySearchAndFilter.expandAccordion(suppressDiscoveryAccordionName);
        InventorySearchAndFilter.selectOptionInExpandedFilter(suppressDiscoveryAccordionName, 'No');
        InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(true);
        InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(false);

        // Step 13: Select the first row's checkbox (single selection, not select-all)
        InventoryInstances.selectInstanceCheckboxByIndex(0);
        InventoryInstances.verifySelectAllInstancesCheckbox(false);

        // Step 14: Switch to Items tab; verify Holdings pane is cleared
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.checkSearchQueryText('');

        // Step 15: Search Items by titlePrefix → all 102 instances matching the title, 2 pages
        // (Title ascending)
        InventoryInstances.searchByTitle(titlePrefix);
        InventoryInstances.checkSearchResultCount(`${allInstances.length} records found`);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.TITLE, true);
        InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(true);
        InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(false);
        InventorySearchAndFilter.verifySearchResult(keptInstances[0].title, true);
        InventorySearchAndFilter.verifySearchResult(lastKeptInstance.title, false);

        // Step 16: Navigate to page 2 (Next × 1); it holds _100 and _101 only; open _100
        InventorySearchAndFilter.clickListInventoryNextPaginationButton();
        InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(false);
        InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(true);
        InventorySearchAndFilter.verifySearchResult(keptInstances[pageSize - 1].title, true);
        InventorySearchAndFilter.verifySearchResult(itemTabRecord.title, true);
        InventorySearchAndFilter.verifySearchResult(keptInstances[0].title, false);
        InventoryInstances.selectInstanceByTitle(itemTabRecord.title);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.checkInstanceTitle(itemTabRecord.title);

        // Step 17: Switch to Instance tab; verify full Instance state is preserved
        InventorySearchAndFilter.switchToInstance();
        verifyInstanceTabState();

        // Step 18: Switch to Holdings tab; verify full Holdings state is preserved
        InventorySearchAndFilter.switchToHoldings();
        verifyHoldingsTabState();

        // Step 19: Switch to Items tab; verify full Items state is preserved
        InventorySearchAndFilter.switchToItem();
        verifyItemsTabState();

        // Step 20: Reset all on the Items tab; verify Items pane is cleared
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.checkSearchQueryText('');

        // Step 21: Switch to Instance tab; Instance state is still preserved (Reset all only affected Items)
        InventorySearchAndFilter.switchToInstance();
        verifyInstanceTabState();
      },
    );
  });
});
