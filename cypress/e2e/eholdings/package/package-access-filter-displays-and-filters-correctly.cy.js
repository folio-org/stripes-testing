import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsPackages,
  EHoldingsPackagesSearch,
  EHoldingsSearch,
} from '../../../support/fragments/eholdings';
import { PACKAGE_ACCESS } from '../../../support/fragments/eholdings/eholdingsConstants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Packages', () => {
    const searchTerm = 'Nature';
    const testData = {};

    const toSlug = (value) => String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const toIsFreeAccess = (access) => access === PACKAGE_ACCESS.PUBLIC;

    // Guarantees every alias below is unique, even across calls sharing the same (or empty)
    // criteria - e.g. two different "All, no query" steps. Without this, both would compute the
    // same alias name and an unrelated, un-wrapped action's request (one that happens to match
    // the earlier, still-active broad intercept) could be consumed by the later wait instead of
    // the response its own action actually triggered.
    let searchCallCounter = 0;

    // Triggers the given UI action and returns the package names the API actually returned for
    // the resulting filter/query combination (filtered defensively by the same criteria, in
    // case the response isn't already exactly scoped). The real KB's package counts for a given
    // combination are unknown and may be zero, so UI assertions must be driven by this real
    // data rather than an assumed fixture. Alias/intercept are scoped per combination, with each
    // criterion matched via a lookahead (order-independent, since different requests put query
    // params in different orders).
    const performSearchAndGetActualPackages = (action, { access, query } = {}) => {
      const aliasParts = [];
      const lookaheads = ['(?=.*eholdings/packages\\?)'];
      if (access !== undefined) {
        aliasParts.push(`access_${toSlug(access)}`);
        lookaheads.push(`(?=.*filter\\[access\\]=${toSlug(access)})`);
      }
      if (query !== undefined) {
        aliasParts.push(`query_${toSlug(query)}`);
        lookaheads.push(`(?=.*q=${encodeURIComponent(query)})`);
      }
      searchCallCounter += 1;
      const alias = `packagesSearch_${aliasParts.join('_')}_${searchCallCounter}`;
      cy.intercept('GET', new RegExp(lookaheads.join(''))).as(alias);
      action();
      return cy
        .wait(`@${alias}`, { timeout: 80_000 })
        .then(({ response }) => response.body.data
          .filter(
            (pkg) => access === undefined ||
                access === PACKAGE_ACCESS.ALL ||
                pkg.attributes.isFreeAccess === toIsFreeAccess(access),
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

    before('Create user', () => {
      cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((user) => {
        testData.user = user;
      });
    });

    after('Delete user', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1464127 Package access filter in Package Search displays correctly and filters packages by access type (promin)',
      { tags: ['criticalPath', 'promin', 'C1464127'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsSearch.waitLoading,
        });
        EHoldingsSearch.switchToPackages();
        EHoldingsPackagesSearch.byName('*');

        // Step 1-2: "Package access" filter is collapsed by default; expanding it shows
        // All/Public/Controlled options with "All" selected by default
        EHoldingsPackagesSearch.verifyPackageAccessAccordionOpen(false);
        EHoldingsPackagesSearch.verifyPackageAccessOptions(Object.values(PACKAGE_ACCESS));
        EHoldingsPackagesSearch.verifyPackageAccessSelected(PACKAGE_ACCESS.ALL);

        // Step 3: select "Public" - only Public packages are returned
        EHoldingsPackagesSearch.togglePackageAccessAccordion();
        EHoldingsPackagesSearch.verifyPackageAccessAccordionOpen(false);
        performSearchAndGetActualPackages(
          () => EHoldingsPackagesSearch.byPackageAccess(PACKAGE_ACCESS.PUBLIC),
          { access: PACKAGE_ACCESS.PUBLIC },
        ).then((publicPackages) => {
          verifyResultsMatch(publicPackages);

          // Step 4: select "Controlled" - only Controlled packages are returned
          EHoldingsPackagesSearch.togglePackageAccessAccordion();
          EHoldingsPackagesSearch.verifyPackageAccessAccordionOpen(false);
          performSearchAndGetActualPackages(
            () => EHoldingsPackagesSearch.byPackageAccess(PACKAGE_ACCESS.CONTROLLED),
            { access: PACKAGE_ACCESS.CONTROLLED },
          ).then((controlledPackages) => {
            verifyResultsMatch(controlledPackages);

            // Steps 5-6: collapse and re-expand the accordion - "Controlled" stays selected
            EHoldingsPackagesSearch.togglePackageAccessAccordion();
            EHoldingsPackagesSearch.verifyPackageAccessAccordionOpen(false);
            EHoldingsPackagesSearch.togglePackageAccessAccordion();
            EHoldingsPackagesSearch.verifyPackageAccessAccordionOpen(true);
            EHoldingsPackagesSearch.verifyPackageAccessSelected(PACKAGE_ACCESS.CONTROLLED);
            verifyResultsMatch(controlledPackages);

            // Step 7: select "All" - all packages are returned regardless of access
            EHoldingsPackagesSearch.togglePackageAccessAccordion();
            EHoldingsPackagesSearch.verifyPackageAccessAccordionOpen(false);
            performSearchAndGetActualPackages(
              () => EHoldingsPackagesSearch.byPackageAccess(PACKAGE_ACCESS.ALL),
              {},
            ).then((allPackages) => {
              verifyResultsMatch(allPackages);

              // Step 8: select "Public", then clear the filter - selection is cleared, all
              // packages are returned regardless of access
              EHoldingsPackagesSearch.togglePackageAccessAccordion();
              EHoldingsPackagesSearch.verifyPackageAccessAccordionOpen(false);
              performSearchAndGetActualPackages(
                () => EHoldingsPackagesSearch.byPackageAccess(PACKAGE_ACCESS.PUBLIC),
                { access: PACKAGE_ACCESS.PUBLIC },
              ).then(() => {
                performSearchAndGetActualPackages(
                  () => EHoldingsPackagesSearch.resetPackageAccessFilter(),
                  {},
                ).then((allPackagesAfterReset) => {
                  EHoldingsPackagesSearch.verifyPackageAccessSelected(PACKAGE_ACCESS.ALL);
                  verifyResultsMatch(allPackagesAfterReset);

                  // Step 9: search for a term that returns both Public and Controlled packages
                  performSearchAndGetActualPackages(
                    () => EHoldingsPackagesSearch.byName(searchTerm),
                    { query: searchTerm },
                  ).then((searchedPackages) => {
                    verifyResultsMatch(searchedPackages);

                    // Step 10: select "Public" - only Public packages matching the term
                    EHoldingsPackagesSearch.togglePackageAccessAccordion();
                    EHoldingsPackagesSearch.verifyPackageAccessAccordionOpen(false);
                    performSearchAndGetActualPackages(
                      () => EHoldingsPackagesSearch.byPackageAccess(PACKAGE_ACCESS.PUBLIC),
                      { access: PACKAGE_ACCESS.PUBLIC, query: searchTerm },
                    ).then((publicSearchedPackages) => {
                      verifyResultsMatch(publicSearchedPackages);

                      // Step 11: select "Controlled" - only Controlled packages matching the term
                      EHoldingsPackagesSearch.togglePackageAccessAccordion();
                      EHoldingsPackagesSearch.verifyPackageAccessAccordionOpen(false);
                      performSearchAndGetActualPackages(
                        () => EHoldingsPackagesSearch.byPackageAccess(PACKAGE_ACCESS.CONTROLLED),
                        { access: PACKAGE_ACCESS.CONTROLLED, query: searchTerm },
                      ).then((controlledSearchedPackages) => {
                        verifyResultsMatch(controlledSearchedPackages);

                        // Step 12: select "All" - all packages matching the term, regardless of
                        // access
                        EHoldingsPackagesSearch.togglePackageAccessAccordion();
                        EHoldingsPackagesSearch.verifyPackageAccessAccordionOpen(false);
                        performSearchAndGetActualPackages(
                          () => EHoldingsPackagesSearch.byPackageAccess(PACKAGE_ACCESS.ALL),
                          { query: searchTerm },
                        ).then((allSearchedPackages) => {
                          verifyResultsMatch(allSearchedPackages);
                        });
                      });
                    });
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
