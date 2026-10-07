import { EHOLDINGS_PACKAGE_CONTENT_TYPES } from '../../../support/constants/constants';
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
    // Safety net: guarantees at least one E-Journal package exists, since step 7 opens a
    // package of this type and the real KB's actual counts per content type are unknown
    const customPackageName = `AT_C1453687_EJournal_${randomPostfix}`;
    const testData = {};
    // Step 10 covers every content type except "All" (default) and "E-Journal" (exercised
    // separately in steps 4-8)
    const remainingContentTypes = Object.values(EHOLDINGS_PACKAGE_CONTENT_TYPES).filter(
      (type) => ![EHOLDINGS_PACKAGE_CONTENT_TYPES.ALL, EHOLDINGS_PACKAGE_CONTENT_TYPES.E_JOURNAL].includes(
        type,
      ),
    );

    // URL slug FOLIO uses for each content type's filter[type] query param value
    // (e.g. "Aggregated Full Text" -> "aggregatedfulltext")
    const toContentTypeSlug = (type) => type.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Selects a content type filter and returns the package names the API actually returned
    // for it (filtered defensively by contentType, in case the response isn't already exactly
    // scoped). The real KB's package counts per type are unknown here and may be zero, so UI
    // assertions must be driven by this real data rather than an assumed fixture.
    const selectContentTypeAndGetActualPackages = (type) => {
      const typeSlug = toContentTypeSlug(type);
      const alias = `packagesSearch_${typeSlug}`;
      cy.intercept('GET', new RegExp(`filter\\[type\\]=${typeSlug}(?:&|$)`)).as(alias);
      EHoldingsPackagesSearch.selectContentType(type);
      return cy
        .wait(`@${alias}`, { timeout: 80_000 })
        .then(({ response }) => response.body.data
          .filter((pkg) => pkg.attributes.contentType === type)
          .map(
            (pkg) => `${pkg.attributes.name}${pkg.attributes.customDisplayName ? ` (${pkg.attributes.customDisplayName})` : ''}`,
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
      EHoldingsPackages.deleteAllPackagesByNameViaAPI('AT_C1453687_*');
      EHoldingsPackages.createPackageViaAPI({
        data: {
          type: 'packages',
          attributes: {
            name: customPackageName,
            contentType: EHOLDINGS_PACKAGE_CONTENT_TYPES.E_JOURNAL,
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
      'C1453687 Packages - Content type filter applied without a search query (promin)',
      { tags: ['extendedPath', 'promin', 'C1453687'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsSearch.waitLoading,
        });
        EHoldingsSearch.switchToPackages();

        // Step 1: expand the Content type accordion; it shows all options (regardless of
        // whether each one actually has matching packages) with "All" selected by default
        EHoldingsPackagesSearch.verifyContentTypeOptions(
          Object.values(EHOLDINGS_PACKAGE_CONTENT_TYPES),
        );
        EHoldingsPackagesSearch.verifyContentTypeSelected(EHOLDINGS_PACKAGE_CONTENT_TYPES.ALL);

        // Steps 2-4: select "E-Journal" - returns E-Journal packages with no search restriction.
        // Guaranteed non-empty by the preconditions (at least one E-Journal package exists)
        selectContentTypeAndGetActualPackages(EHOLDINGS_PACKAGE_CONTENT_TYPES.E_JOURNAL).then(
          (eJournalPackages) => {
            expect(eJournalPackages.length).to.be.greaterThan(0);
            verifyResultsMatch(eJournalPackages);

            // Steps 5-6: collapse and re-expand the accordion - the E-Journal selection persists
            EHoldingsPackagesSearch.toggleContentTypeAccordion();
            EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(false);
            EHoldingsPackagesSearch.toggleContentTypeAccordion();
            EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(true);
            EHoldingsPackagesSearch.verifyContentTypeSelected(
              EHOLDINGS_PACKAGE_CONTENT_TYPES.E_JOURNAL,
            );

            // Step 7: open the first package; Content type shows "E-Journal"
            EHoldingsPackages.openPackageByName(eJournalPackages[0]);
            EHoldingsPackages.verifyContentType(EHOLDINGS_PACKAGE_CONTENT_TYPES.E_JOURNAL);

            // Step 8: close the package detail pane - back to the filtered results list. This
            // re-fires the same packages search call, so it must be drained here - otherwise
            // step 10's first wait would pick up this call instead of its own selection's
            EHoldingsPackage.closePackage();
            verifyResultsMatch(eJournalPackages);

            // Step 9: reset the Content type filter via the "x" icon - resets to "All"
            EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(false);
            EHoldingsPackagesSearch.resetContentTypeFilter();
            EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(false);
            EHoldingsPackagesSearch.toggleContentTypeAccordion();
            EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(true);
            EHoldingsPackagesSearch.verifyContentTypeSelected(EHOLDINGS_PACKAGE_CONTENT_TYPES.ALL);
            EHoldingsPackagesSearch.checkResultsListShown(false);

            // Step 10: for every remaining content type, verify the UI matches what the API
            // actually returned for it - some may legitimately be empty
            remainingContentTypes.forEach((contentType) => {
              selectContentTypeAndGetActualPackages(contentType).then((names) => {
                verifyResultsMatch(names);
              });
            });
          },
        );
      },
    );
  });
});
