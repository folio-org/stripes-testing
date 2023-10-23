import { DevTeams, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import eHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';

describe('eHoldings Package + Title', () => {
  const testData = {
    packageName: 'Wiley Obooks (CCINSHAE)',
    selectedStatus: 'Selected',
  };

  before('logging in', () => {
    cy.loginAsAdmin({
      path: TopMenu.eholdingsPath,
      waiter: EHoldingsTitlesSearch.waitLoading,
    }).then(() => {
      EHoldingSearch.switchToPackages();
    });
  });

  it(
    'C354003 Verify that "Export" button become disabled when user does not choose any fields to export (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      EHoldingsPackagesSearch.byName(testData.packageName);
      EHoldingsPackages.verifyPackageInResults(testData.packageName);
      EHoldingsPackages.openPackage();
      EHoldingsPackageView.waitLoading();

      EHoldingsPackages.titlesSearchFilter('Title', '', testData.selectedStatus);
      EHoldingsPackages.clickSearchTitles();

      eHoldingsResourceView.openExportModal();
      EHoldingsPackageView.clickExportSelectedPackageFields();
      EHoldingsPackageView.clickExportSelectedTitleFields();
      EHoldingsPackageView.verifyExportButtonInModalDisabled();
      eHoldingsResourceView.closeExportModalViaCancel();
      eHoldingsResourceView.checkHoldingStatus(testData.selectedStatus);
    },
  );
});
