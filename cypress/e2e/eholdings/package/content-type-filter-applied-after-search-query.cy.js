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
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('eHoldings', () => {
  describe('Packages', () => {
    const randomPostfix = getRandomPostfix();
    const searchTerm = `AT_C1453686_Package_${randomPostfix}`;

    // One package per content type, except E-Journal (2 packages, to verify multiple results),
    // and Print / Streaming Media (0 packages, to verify the empty-results case)
    const packagesByContentType = {
      [EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK]: [`${searchTerm}_EBook`],
      [EHOLDINGS_PACKAGE_CONTENT_TYPES.AGGREGATED_FULL_TEXT]: [`${searchTerm}_AggregatedFullText`],
      [EHOLDINGS_PACKAGE_CONTENT_TYPES.ABSTRACT_AND_INDEX]: [`${searchTerm}_AbstractAndIndex`],
      [EHOLDINGS_PACKAGE_CONTENT_TYPES.E_JOURNAL]: [
        `${searchTerm}_EJournal1`,
        `${searchTerm}_EJournal2`,
      ],
      [EHOLDINGS_PACKAGE_CONTENT_TYPES.MIXED_CONTENT]: [`${searchTerm}_MixedContent`],
      [EHOLDINGS_PACKAGE_CONTENT_TYPES.ONLINE_REFERENCE]: [`${searchTerm}_OnlineReference`],
      [EHOLDINGS_PACKAGE_CONTENT_TYPES.UNKNOWN]: [`${searchTerm}_Unknown`],
    };
    const packageName = packagesByContentType[EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK][0];
    const allPackageNames = Object.values(packagesByContentType).flat();
    const emptyResultContentTypes = [
      EHOLDINGS_PACKAGE_CONTENT_TYPES.PRINT,
      EHOLDINGS_PACKAGE_CONTENT_TYPES.STREAMING_MEDIA,
    ];
    // Step 11 covers every content type except "All" and "E-Book" (already exercised earlier)
    const remainingContentTypes = Object.values(EHOLDINGS_PACKAGE_CONTENT_TYPES).filter(
      (type) => ![EHOLDINGS_PACKAGE_CONTENT_TYPES.ALL, EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK].includes(
        type,
      ),
    );

    const testData = {};

    before('Create packages via API and user', () => {
      cy.getAdminToken();
      EHoldingsPackages.deleteAllPackagesByNameViaAPI('AT_C1453686_*');

      Object.entries(packagesByContentType).forEach(([contentType, names]) => {
        names.forEach((name) => {
          EHoldingsPackages.createPackageViaAPI({
            data: {
              type: 'packages',
              attributes: { name, contentType },
            },
          });
        });
      });

      cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((user) => {
        testData.user = user;
      });
    });

    after('Delete packages and user', () => {
      cy.getAdminToken(false);
      Object.values(packagesByContentType)
        .flat()
        .forEach((name) => EHoldingsPackages.deletePackageViaAPI(name));
      Users.deleteViaApi(testData.user?.userId);
    });

    it(
      'C1453686 Packages - Content type filter applied after entering a search query (promin)',
      { tags: ['criticalPath', 'promin', 'C1453686'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsSearch.waitLoading,
        });

        // Step 1: search by the shared prefix - every package created above matches it
        EHoldingsSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(`${searchTerm}*`);
        EHoldingsPackagesSearch.checkResultsListShown(true);
        EHoldingsPackagesSearch.verifyResultsCount(allPackageNames.length);

        // Steps 2-4: expand the Content type accordion; it shows all options with "All"
        // selected by default
        EHoldingsPackagesSearch.verifyContentTypeOptions(
          Object.values(EHOLDINGS_PACKAGE_CONTENT_TYPES),
        );
        EHoldingsPackagesSearch.verifyContentTypeSelected(EHOLDINGS_PACKAGE_CONTENT_TYPES.ALL);
        EHoldingsPackages.verifyPackageExistsInResults(packageName);

        // Step 5: select "E-Book" - only the E-Book package shows in results
        EHoldingsPackagesSearch.selectContentType(EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK);
        EHoldingsPackagesSearch.verifyResultsCount(1);
        EHoldingsPackages.verifyPackageExistsInResults(packageName);

        // Step 6-7: collapse and re-expand the accordion - the E-Book selection persists
        EHoldingsPackagesSearch.toggleContentTypeAccordion();
        EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(false);
        EHoldingsPackagesSearch.toggleContentTypeAccordion();
        EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(true);
        EHoldingsPackagesSearch.verifyContentTypeSelected(EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK);

        // Step 8: open the package record; Content type shows "E-Book"
        EHoldingsPackages.openPackageByName(packageName);
        EHoldingsPackages.verifyContentType(EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK);

        // Step 9: close the package detail pane - back to the (still filtered) results list
        EHoldingsPackage.closePackage();
        EHoldingsPackagesSearch.verifyResultsCount(1);
        EHoldingsPackages.verifyPackageExistsInResults(packageName);

        // Step 10: reset the Content type filter via the accordion header's "x" icon - every
        // package is back in the results
        EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(false);
        EHoldingsPackagesSearch.resetContentTypeFilter();
        EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(false);
        EHoldingsPackagesSearch.toggleContentTypeAccordion();
        EHoldingsPackagesSearch.verifyContentTypeAccordionOpen(true);
        EHoldingsPackagesSearch.verifyContentTypeSelected(EHOLDINGS_PACKAGE_CONTENT_TYPES.ALL);
        EHoldingsPackagesSearch.verifyResultsCount(allPackageNames.length);
        EHoldingsPackages.verifyPackageExistsInResults(packageName);

        // Step 11: for every remaining content type, verify the expected packages are found
        // (or an empty result list, for the two types with no matching package) - no errors
        remainingContentTypes.forEach((contentType) => {
          EHoldingsPackagesSearch.selectContentType(contentType);
          EHoldingsPackagesSearch.verifyContentTypeSelected(contentType);

          if (emptyResultContentTypes.includes(contentType)) {
            EHoldingsPackages.checkNoResultsFound(`${searchTerm}*`);
          } else {
            const expectedNames = packagesByContentType[contentType];

            EHoldingsPackagesSearch.verifyResultsCount(expectedNames.length);
            expectedNames.forEach((name) => EHoldingsPackages.verifyPackageExistsInResults(name));
          }
          InteractorsTools.checkNoErrorCallouts();
        });

        // Step 12: select "All" again - every created package is back in the results
        EHoldingsPackagesSearch.selectContentType(EHOLDINGS_PACKAGE_CONTENT_TYPES.ALL);
        EHoldingsPackagesSearch.verifyResultsCount(allPackageNames.length);
        allPackageNames.forEach((name) => EHoldingsPackages.verifyPackageExistsInResults(name));
      },
    );
  });
});
