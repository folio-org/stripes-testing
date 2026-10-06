import { EHOLDINGS_PACKAGE_CONTENT_TYPES } from '../../../support/constants/constants';
import { FILTER_STATUSES } from '../../../support/fragments/eholdings/eholdingsConstants';
import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsPackages,
  EHoldingsPackagesSearch,
  EHoldingsPackage,
  EHoldingsSearch,
} from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Packages', () => {
    const randomPostfix = getRandomPostfix();
    const searchTerm = 'nature';
    // Safety net: guarantees at least one Selected E-Book package exists, since steps 1-5 rely
    // on this combination and the real KB's actual counts for it are unknown
    const customPackageName = `AT_C1453688_SelectedEBook_${randomPostfix}`;
    const testData = {};

    const toSlug = (value) => String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    // Triggers the given UI action and returns the package names the API actually returned for
    // the resulting filter/query combination (filtered defensively by the same criteria, in
    // case the response isn't already exactly scoped). The real KB's package counts for a given
    // combination are unknown and may be zero, so UI assertions must be driven by this real
    // data rather than an assumed fixture.
    const performSearchAndGetActualPackages = (action, { selected, type, query } = {}) => {
      const aliasParts = [];
      const lookaheads = [];
      if (selected !== undefined) {
        aliasParts.push(`selected_${selected}`);
        lookaheads.push(`(?=.*filter\\[selected\\]=${selected})`);
      }
      if (type !== undefined) {
        aliasParts.push(`type_${toSlug(type)}`);
        lookaheads.push(`(?=.*filter\\[type\\]=${toSlug(type)}(?:&|$))`);
      }
      if (query !== undefined) {
        aliasParts.push(`query_${toSlug(query)}`);
        lookaheads.push(`(?=.*q=${encodeURIComponent(query)})`);
      }
      const alias = `packagesSearch_${aliasParts.join('_')}`;
      cy.intercept('GET', new RegExp(lookaheads.join(''))).as(alias);
      action();
      return cy
        .wait(`@${alias}`, { timeout: 80_000 })
        .then(({ response }) => response.body.data
          .filter(
            (pkg) => (selected === undefined || pkg.attributes.isSelected === selected) &&
                (type === undefined || pkg.attributes.contentType === type),
          )
          .map(
            (pkg) => `${pkg.attributes.name}${
              pkg.attributes.customDisplayName ? ` (${pkg.attributes.customDisplayName})` : ''
            }`,
          ));
    };

    const verifyResultsMatch = (packageNames) => {
      if (packageNames.length === 0) {
        EHoldingsPackagesSearch.checkResultsListShown(false);
      } else {
        EHoldingsPackagesSearch.verifyResultsCount(packageNames.length);
        packageNames.forEach((name) => EHoldingsPackages.verifyPackageExistsInResults(name));
      }
    };

    before('Create safety-net package and user', () => {
      cy.getAdminToken();
      EHoldingsPackages.deleteAllPackagesByNameViaAPI('AT_C1453688_*');
      EHoldingsPackages.createPackageViaAPI({
        data: {
          type: 'packages',
          attributes: {
            name: customPackageName,
            contentType: EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK,
          },
        },
      });

      cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((user) => {
        testData.user = user;
      });
    });

    after('Delete safety-net package and user', () => {
      cy.getAdminToken(false);
      EHoldingsPackages.deletePackageViaAPI(customPackageName);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1453688 Packages - Content type filter combined with Selection status filter (promin)',
      { tags: ['extendedPath', 'promin', 'C1453688'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsSearch.waitLoading,
        });
        EHoldingsSearch.switchToPackages();

        // Step 1: select "Selected" in the Selection status filter - list updates to show only
        // selected packages
        performSearchAndGetActualPackages(
          () => EHoldingsPackagesSearch.bySelectionStatus(FILTER_STATUSES.SELECTED),
          { selected: true },
        ).then((selectedPackages) => {
          verifyResultsMatch(selectedPackages);

          // Step 2: expand Content type, select "E-Book" - list updates to selected E-Book
          // packages only. Guaranteed non-empty by the preconditions
          performSearchAndGetActualPackages(
            () => EHoldingsPackagesSearch.byContentType(EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK),
            { selected: true, type: EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK },
          ).then((selectedEBookPackages) => {
            expect(selectedEBookPackages.length).to.be.greaterThan(0);
            EHoldingsPackagesSearch.verifyContentTypeSelected(
              EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK,
            );
            verifyResultsMatch(selectedEBookPackages);

            // Step 3: open any package from the results; Content type shows "E-Book", Holdings
            // status shows "Selected"
            EHoldingsPackages.openPackageByName(selectedEBookPackages[0]);
            EHoldingsPackages.verifyContentType(EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK);
            EHoldingsPackages.verifyPackageHoldingStatus(FILTER_STATUSES.SELECTED);

            // Step 4: close the package detail pane - back to the list, with both filters
            // still active
            performSearchAndGetActualPackages(() => EHoldingsPackage.closePackage(), {
              selected: true,
              type: EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK,
            }).then((packagesAfterClose) => {
              verifyResultsMatch(packagesAfterClose);
              EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(false);
              EHoldingsPackagesSearch.toggleContentTypeAccordion();
              EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(true);

              EHoldingsPackagesSearch.verifySelectionStatusAccordionOpen(false);
              EHoldingsPackagesSearch.toggleSelectionStatusAccordion();
              EHoldingsPackagesSearch.verifySelectionStatusAccordionOpen(true);

              EHoldingsPackagesSearch.verifyContentTypeSelected(
                EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK,
              );
              EHoldingsPackagesSearch.verifySelectionStatusSelected(FILTER_STATUSES.SELECTED);

              // Step 5: enter a search term - list further filters to selected E-Book packages
              // matching the term
              performSearchAndGetActualPackages(() => EHoldingsPackagesSearch.byName(searchTerm), {
                selected: true,
                type: EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK,
                query: searchTerm,
              }).then((searchedPackages) => {
                verifyResultsMatch(searchedPackages);

                // Step 6: reset the Content type filter - resets to "All"; Selection status
                // and the search term remain active
                performSearchAndGetActualPackages(
                  () => EHoldingsPackagesSearch.resetContentTypeFilter(),
                  { selected: true, query: searchTerm },
                ).then((selectedSearchedPackages) => {
                  verifyResultsMatch(selectedSearchedPackages);
                  EHoldingsPackagesSearch.verifyContentTypeSelected(
                    EHOLDINGS_PACKAGE_CONTENT_TYPES.ALL,
                  );
                  EHoldingsPackagesSearch.verifySelectionStatusSelected(FILTER_STATUSES.SELECTED);

                  // Step 7: reset the Selection status filter - resets to "All"; only the
                  // search term remains active
                  performSearchAndGetActualPackages(
                    () => EHoldingsPackagesSearch.resetSelectionStatusFilter(),
                    { query: searchTerm },
                  ).then((searchedOnlyPackages) => {
                    verifyResultsMatch(searchedOnlyPackages);
                    EHoldingsPackagesSearch.verifySelectionStatusSelected(FILTER_STATUSES.ALL);
                  });
                });
              });
            });
          });
        });
      },
    );
  });
});
