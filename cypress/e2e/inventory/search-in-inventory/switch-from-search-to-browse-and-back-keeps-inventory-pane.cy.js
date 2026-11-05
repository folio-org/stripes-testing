import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  INSTANCE_SOURCE_NAMES,
  INVENTORY_COLUMN_HEADERS,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const titlePrefix = `AT_C398015_FolioInstance_${randomPostfix}`;
    const contributorBase = `AT_C398015_Contributor_${randomPostfix}`;
    const subjectValue = `AT_C398015_Subject_${randomPostfix}`;
    const pageSize = 100;
    const padNumber = (number) => String(number).padStart(3, '0');
    // 101 instances of the "kept" type + 1 instance of another type = 102, so the search result
    // spans 2 pages. Title and Contributor values end with the same zero-padded number, so the
    // Contributors ascending order is simply the order of this array: the other-type instance
    // (_000) sorts first, then _001 ... _101
    const keptInstances = Array.from({ length: pageSize + 1 }, (_, index) => ({
      id: uuid(),
      title: `${titlePrefix}_${padNumber(index + 1)}`,
      contributor: `${contributorBase}_${padNumber(index + 1)}`,
    }));
    const otherTypeInstance = {
      id: uuid(),
      title: `${titlePrefix}_${padNumber(0)}`,
      contributor: `${contributorBase}_${padNumber(0)}`,
    };
    const allInstancesSorted = [otherTypeInstance, ...keptInstances];
    // Pages of the search result by "Contributors" ascending:
    // - without facets: page 1 = _000.._099, page 2 = _100, _101
    // - with the Resource type facet (other type filtered out): page 1 = _001.._100, page 2 = _101
    const unfilteredPages = [
      allInstancesSorted.slice(0, pageSize),
      allInstancesSorted.slice(pageSize),
    ];
    const filteredPages = [keptInstances.slice(0, pageSize), keptInstances.slice(pageSize)];
    const sourceAccordionName = 'Source';
    const resourceTypeAccordionName = 'Resource type';
    const hiddenColumn = INVENTORY_COLUMN_HEADERS.RELATION;
    // Results list columns: 0 - "Select instance" checkbox, 1 - Title, 2 - Contributors
    const contributorsColumnIndex = 2;
    const verifyContributorsOrder = (instances) => {
      InventoryInstances.getResultsListByColumn(contributorsColumnIndex).then((cells) => {
        expect(cells).to.have.lengthOf(instances.length);
        cells.forEach((cell, index) => {
          expect(cell, `row ${index}`).to.include(instances[index].contributor);
        });
      });
    };
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      // Leftovers of earlier runs (different random postfix); 102 instances > 100 per search
      // response, hence the second pass
      InventoryInstances.deleteInstanceByTitleViaApi('C398015_');
      InventoryInstances.deleteInstanceByTitleViaApi('C398015_');

      cy.then(() => {
        // Two different instance types: the first one is kept by the Resource type facet
        cy.getInstanceTypes({ limit: 2, query: 'source<>local' }).then((instanceTypes) => {
          testData.keptInstanceTypeId = instanceTypes[0].id;
          testData.keptInstanceTypeName = instanceTypes[0].name;
          testData.otherInstanceTypeId = instanceTypes[1].id;
        });
        BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
          testData.contributorNameTypeId = contributorNameTypes[0].id;
        });
      })
        .then(() => {
          const instancesToCreate = [
            { ...otherTypeInstance, instanceTypeId: testData.otherInstanceTypeId },
            ...keptInstances.map((instance) => ({
              ...instance,
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
            subjects: [{ value: subjectValue }],
          }));

          // One batch request instead of 102 single ones
          cy.batchUpdateInstancesViaApi(instancesToCreate).then((response) => {
            expect(response.status).to.eq(201);
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((userProperties) => {
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

      cy.getAdminToken(false);
      // By known ids - a title search returns max 100 records and may lag behind the deletions
      allInstancesSorted.forEach(({ id }) => InventoryInstance.deleteInstanceViaApi(id));
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C398015 Switch from "Search" to "Browse" and back doesn\'t clear "Inventory" pane (spitfire)',
      { tags: ['extendedPath', 'promin', 'C398015'] },
      () => {
        // The new search of Step 5 shows page 1 of the filtered result: _001.._100
        const pageBeforeSwitch = filteredPages[0];

        // State of the Inventory pane that must survive leaving the Search tab (Steps 9 and 11)
        const verifyInventoryPaneState = () => {
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.checkSearchQueryText(titlePrefix);
          // Same page and the same rows in the same (Contributors ascending) order
          InventorySearchAndFilter.checkRowsCount(pageBeforeSwitch.length);
          verifyContributorsOrder(pageBeforeSwitch);
          InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, true);
          InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(true);
          InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(false);
          InventorySearchAndFilter.verifySearchResult(otherTypeInstance.title, false);
          // Disabled column still hidden
          InventorySearchAndFilter.validateSearchTableColumnsShown(hiddenColumn, false);
          // Detail view closed, last opened record highlighted, no records selected
          InventorySearchAndFilter.verifyInstanceDetailsViewAbsent();
          InventoryInstances.verifyRowIsHighlighted(0);
          InventoryInstances.verifySelectAllInstancesCheckbox(false);
          InventoryInstances.verifyAllCheckboxesAreChecked(false);
          // Facet accordions get closed when leaving the Search tab / the app - expand them
          // and verify the applied options are still selected
          InventorySearchAndFilter.verifyAccordionByNameExpanded(sourceAccordionName, false);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(resourceTypeAccordionName, false);
          InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            sourceAccordionName,
            INSTANCE_SOURCE_NAMES.FOLIO,
            true,
          );
          InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
          // Resource type is a multi-select, not a set of checkboxes
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            resourceTypeAccordionName,
            testData.keptInstanceTypeName,
          );
          InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
            resourceTypeAccordionName,
            1,
          );
        };

        // Step 1: search by the unique title prefix (instead of "*") - own 102 instances only,
        // 100 of them on the first page
        InventoryInstances.searchByTitle(titlePrefix);
        InventoryInstances.checkSearchResultCount(`${allInstancesSorted.length} records found`);
        InventorySearchAndFilter.checkRowsCount(pageSize);

        // Step 2: sort by "Contributors" - ascending; first page is _000.._099
        InventoryInstances.clickColumnHeader(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, true);
        verifyContributorsOrder(unfilteredPages[0]);
        InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(true);
        InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(false);

        // Step 3: go to the next page - _100 and _101 (the same sort order continues)
        InventorySearchAndFilter.clickListInventoryNextPaginationButton();
        InventorySearchAndFilter.checkRowsCount(unfilteredPages[1].length);
        verifyContributorsOrder(unfilteredPages[1]);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, true);
        InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(false);
        InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(true);

        // Step 4: hide the "Relation" column via Actions > Show columns
        InventoryInstances.clickActionsButton();
        InventorySearchAndFilter.toggleShowColumnCheckbox(hiddenColumn, false);
        InventorySearchAndFilter.validateSearchTableColumnsShown(hiddenColumn, false);

        // Step 5: apply facets - Source "FOLIO" and Resource type of the kept instances;
        // 101 records remain (the other-type _000 is gone)
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
        InventorySearchAndFilter.verifySearchResult(otherTypeInstance.title, false);
        // New search - back to page 1: _001.._100, Next enabled
        InventorySearchAndFilter.checkRowsCount(pageBeforeSwitch.length);
        verifyContributorsOrder(pageBeforeSwitch);
        InventorySearchAndFilter.verifyListInventoryPreviousButtonDisabled(true);
        InventorySearchAndFilter.verifyListInventoryNextButtonDisabled(false);

        // Step 6: select all records with the checkbox in the header
        InventoryInstances.clickSelectAllInstancesCheckbox();
        InventoryInstances.verifySelectAllInstancesCheckbox(true);

        // Step 7: open the first Instance record of the page
        InventoryInstances.selectInstanceByTitle(pageBeforeSwitch[0].title);
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(pageBeforeSwitch[0].title);

        // Step 8: switch to Browse, browse for the own subject
        BrowseSubjects.waitForSubjectToAppear(subjectValue);
        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        BrowseSubjects.browse(subjectValue);
        BrowseSubjects.checkSearchResultsTable();

        // Step 9: back to Search - the pane is as it was before switching
        InventorySearchAndFilter.switchToSearchTab();
        verifyInventoryPaneState();

        // Step 10: go to the MARC authority app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.waitLoading();

        // Step 11: back to the Inventory app - the pane is as it was before switching
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        verifyInventoryPaneState();
      },
    );
  });
});
