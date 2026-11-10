import { Permissions } from '../../../support/dictionary';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageName: `AT_C756_EHoldingsPackage_${getRandomPostfix()}`,
      // lower case: eHoldings shows tags in lower case
      tag: `at_c756_tag_${getRandomLetters(10)}`,
    };

    before('Create package with a tag, user and login', () => {
      cy.getAdminToken();
      cy.createTagApi({ label: testData.tag, description: testData.tag }).then((tagId) => {
        testData.tagId = tagId;
      });
      EHoldingsPackages.createPackageViaAPI({
        data: {
          type: 'packages',
          attributes: { name: testData.packageName, contentType: 'E-Book' },
        },
      })
        .then(({ data }) => {
          cy.addTagsToEHoldingsEntityApi({
            entityId: data.id,
            entityName: testData.packageName,
            tags: [testData.tag],
            isPackage: true,
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.uieHoldingsRecordsEdit.gui,
            Permissions.uiTagsPermissionAll.gui,
            Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.eholdingsPath,
              waiter: EHoldingsTitlesSearch.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      EHoldingsPackages.deletePackageViaAPI(testData.packageName);
      Users.deleteViaApi(testData.user.userId);
      cy.deleteTagApi(testData.tagId, true);
    });

    it(
      'C756 Remove a tag from a package record (promin)',
      { tags: ['extendedPath', 'promin', 'C756'] },
      () => {
        // Step 1: Filter packages by the tag
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byTag(testData.tag);

        // Step 2: Open the package returned - it has the tag
        EHoldingsPackages.openPackageByName(testData.packageName);
        EHoldingsPackage.waitLoading(testData.packageName);
        EHoldingsPackage.verifyExistingTags(testData.tag);

        // Step 3: Remove the tag
        cy.intercept('PUT', '**/eholdings/packages/*/tags').as('updateTags');
        EHoldingsPackage.removeExistingTags();
        cy.wait('@updateTags');

        // Steps 4-5: Update the page, open the package again - the tag is removed from the package
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EHOLDINGS);
        EHoldingsTitlesSearch.waitLoading();
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.openPackageByName(testData.packageName);
        EHoldingsPackage.waitLoading(testData.packageName);
        EHoldingsPackage.verifyDeletedTags(testData.tag);
      },
    );
  });
});
