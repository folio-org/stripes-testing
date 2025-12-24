import { Permissions } from '../../support/dictionary';
import EHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import EHoldingsTitles from '../../support/fragments/eholdings/eHoldingsTitles';
import EHoldingsTitle from '../../support/fragments/eholdings/eHoldingsTitle';
import EHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import EHoldingsProviderView from '../../support/fragments/eholdings/eHoldingsProviderView';
import EHoldingsResourceView from '../../support/fragments/eholdings/eHoldingsResourceView';

describe('eHoldings', () => {
  const randomPostfix = getRandomPostfix();
  const packageName = `AT_C376613_Package_${randomPostfix}`;
  const titleName = `AT_C376613_Title_${randomPostfix}`;
  const providerTag = `at_c376613_providertag_${randomPostfix}`;
  const packageTag = `at_c376613_packagetag_${randomPostfix}`;
  const titleTag = `at_c376613_titletag_${randomPostfix}`;
  const testPackage = EHoldingsPackages.getdefaultPackage();
  let user;

  testPackage.data.attributes.name = packageName;

  before('Create test data', () => {
    cy.getAdminToken();
    EHoldingsPackages.createPackageViaAPI(testPackage).then((createdPackage) => {
      EHoldingsTitles.createEHoldingTitleVIaApi({
        packageId: createdPackage.data.id,
        titleName,
      });

      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiTagsPermissionAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    EHoldingsPackages.deletePackageViaAPI(packageName, true);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C376613 Added tags shown in search filter for Packages, Titles, Providers (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C376613'] },
    () => {
      EHoldingSearch.switchToProviders();
      EHoldingsProvidersSearch.byProvider('a');
      EHoldingsProviders.viewProvider();
      EHoldingsProviders.addTag(providerTag);
      cy.wait(500);
      EHoldingsProviders.verifyExistingTags(providerTag);
      EHoldingsProviderView.close();

      EHoldingSearch.switchToPackages();
      EHoldingsPackagesSearch.byName(packageName);
      EHoldingsPackages.openPackage();
      EHoldingsPackage.addTag(packageTag);
      cy.wait(500);
      EHoldingsPackage.verifyExistingTags(packageTag);
      EHoldingsPackage.closePackage();

      EHoldingSearch.switchToTitles();
      EHoldingsTitlesSearch.byTitle(titleName);
      EHoldingsTitles.openTitle(0);
      EHoldingsTitle.waitPackagesLoading();
      EHoldingsTitle.openResource();
      EHoldingsResourceView.waitLoading();
      EHoldingsResourceView.addTag(titleTag);
      cy.wait(500);
      EHoldingsResourceView.verifyExistingTags(titleTag);
      EHoldingsResourceView.closeHoldingsResourceView();
      EHoldingsTitle.waitPackagesLoading();
      EHoldingsTitle.closeHoldingsTitleView();

      EHoldingsPackagesSearch.verifyTagPresentInFilter(providerTag);
      EHoldingsPackagesSearch.verifyTagPresentInFilter(packageTag, false);
      EHoldingsPackagesSearch.verifyTagPresentInFilter(titleTag, false);

      EHoldingSearch.switchToPackages();
      EHoldingsPackagesSearch.verifyTagPresentInFilter(providerTag);
      EHoldingsPackagesSearch.verifyTagPresentInFilter(packageTag, false);
      EHoldingsPackagesSearch.verifyTagPresentInFilter(titleTag, false);

      EHoldingSearch.switchToProviders();
      EHoldingsPackagesSearch.verifyTagPresentInFilter(providerTag);
      EHoldingsPackagesSearch.verifyTagPresentInFilter(packageTag, false);
      EHoldingsPackagesSearch.verifyTagPresentInFilter(titleTag, false);
    },
  );
});
