import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import EHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsPackageView from '../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsTitlesSearch from '../../support/fragments/eholdings/eHoldingsTitlesSearch';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import DevTeams from '../../support/dictionary/devTeams';

describe('eHoldings -> Package', () => {
  const testData = {
    packageName: 'Wiley Obooks (CCINSHAE)',
  };

  before('Creating user, logging in', () => {
    cy.createTempUser([
      Permissions.moduleeHoldingsEnabled.gui,
      Permissions.exportManagerAll.gui
    ]).then(userProperties => {
      testData.userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, { path: TopMenu.eholdingsPath, waiter: EHoldingsTitlesSearch.waitLoading }).then(() => {
        EHoldingSearch.switchToPackages();
      });
    });
  });

  after('Deleting user', () => {
    Users.deleteViaApi(testData.userId);
  });

  it('C354002 Verify that "Export" button become disabled when user doesn\'t choose any fields to export (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    EHoldingsPackagesSearch.byName(testData.packageName);
    EHoldingsPackages.checkPackageInResults(testData.packageName);
    EHoldingsPackages.openPackage();
    EHoldingsPackageView.waitLoading();
    EHoldingsPackageView.openExportModal();
    EHoldingsPackageView.clickExportSelectedPackageFields();
    EHoldingsPackageView.clickExportSelectedTitleFields();
    EHoldingsPackageView.checkExportButtonInModalDisabled();
    EHoldingsPackageView.closeExportModalViaCancel();
  });
});
