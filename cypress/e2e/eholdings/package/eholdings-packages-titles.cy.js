import { Permissions } from '../../../support/dictionary';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings Package + Title', () => {
  const testData = {
    packageName: 'Wiley Obooks (CCINSHAE)',
    selectedStatus: 'Selected',
  };

  before('Creating user, logging in', () => {
    cy.createTempUser([
      Permissions.moduleeHoldingsEnabled.gui,
      Permissions.uieHoldingsRecordsEdit.gui,
    ]).then((userProperties) => {
      testData.userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.eholdingsPath,
        waiter: EHoldingsTitlesSearch.waitLoading,
      }).then(() => {
        EHoldingSearch.switchToPackages();
      });
    });
  });

  after('Deleting user, data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userId);
  });

  it(
    'C354003 Verify that "Export" button become disabled when user does not choose any fields to export (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
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
