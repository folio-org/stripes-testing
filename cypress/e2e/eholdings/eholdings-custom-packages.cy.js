import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import EHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsPackageView from '../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsTitlesSearch from '../../support/fragments/eholdings/eHoldingsTitlesSearch';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import DevTeams from '../../support/dictionary/devTeams';
import getRandomPostfix from '../../support/utils/stringTools';

describe('eHoldings -> Package', () => {
  const testData = {
    customPackageName: `C692_package_${getRandomPostfix()}`,
  };

  before('Creating user, logging in', () => {
    cy.createTempUser([
      permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
      permissions.uieHoldingsRecordsEdit.gui,
      permissions.uieHoldingsPackageTitleSelectUnselect.gui
    ]).then(userProperties => {
      testData.userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, { path: TopMenu.eholdingsPath, waiter: EHoldingsTitlesSearch.waitLoading });
    });
  });

  after('Deleting user', () => {
    Users.deleteViaApi(testData.userId);
  });

  it('C692 Create a custom package (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    EHoldingSearch.switchToPackages();
    EHoldingsPackages.createCustomPackage(testData.customPackageName);
    EHoldingsPackageView.waitLoading();
    EHoldingsPackageView.verifyPackageName(testData.customPackageName);
    EHoldingsPackageView.close();
    // wait for package to be available for search
    cy.wait(5000);
    EHoldingsPackagesSearch.byName(testData.customPackageName);
    EHoldingsPackages.checkPackageInResults(testData.customPackageName);
  });
});
