import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsPackageView,
  EHoldingsPackages,
  EHoldingsPackagesSearch,
} from '../../../support/fragments/eholdings';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import { AssignedUsers } from '../../../support/fragments/settings/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      package: {
        status: 'Selected',
      },
      user: {},
    };

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.exportManagerAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        AssignedUsers.assignUserToDefaultCredentialsViaApi({ userId: testData.user.userId });

        cy.login(testData.user.username, testData.user.password, {
          path: `${TopMenu.eholdingsPath}?searchType=packages`,
          waiter: EHoldingsPackages.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FileManager.deleteFileFromDownloadsByMask(`*${testData.package.id}*_resource.csv`);
        FileManager.deleteFileFromDownloadsByMask(testData.packageData);
        FileManager.deleteFileFromDownloadsByMask(testData.titleData);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C354001 Export of selected “Package+Title” with all fields of “Package” and “Title” selected by default settings (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        // Fill in the input field with the search query, Click on the "Search" button.
        EHoldingsPackagesSearch.byName('Wiley Online Library');
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Click on the "Selection status" accordion, Click on the "Selected" status.
        EHoldingsPackagesSearch.bySelectionStatus(testData.package.status);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();

        EHoldingsPackages.sortPackagesByTitlesCount().then((packages) => {
          testData.package.id = packages[0].id;
          testData.package.name = packages[0].name;
          testData.package.titles = packages[0].count;

          testData.packageData = `package_data_${testData.package.id}.csv`;
          testData.titleData = `title_data_${testData.package.id}.csv`;

          // View "Package" record with "Total titles" value more than 1.
          EHoldingsPackages.openPackageWithExpectedName(testData.package.name);
          EHoldingsPackageView.verifyPackageDetailViewIsOpened(
            testData.package.name,
            testData.package.titles,
            testData.package.status,
          );

          // Click title record with "Selected" status from 'Titles' section.
          const EHoldingsResourceView = EHoldingsPackageView.selectTitleRecord();
          EHoldingsResourceView.getResourceDetails().then((details) => {
            testData.recource = details;
          });
          // Click on the "Actions" button, Select "Export package (CSV)" option.
          const ExportSettingsModal = EHoldingsResourceView.openExportModal();

          // Click on the "Export" button.
          ExportSettingsModal.clickExportButton();

          EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
            // Go to "Export manager" app.
            cy.visit(TopMenu.exportManagerPath);

            // Verify row with "Job ID" displayed at export jobs list.
            ExportManagerSearchPane.searchByEHoldings();
            ExportManagerSearchPane.verifyResult(jobId);

            // Download the exported ".csv" file by clicking on the "Job ID" hyperlink.
            ExportManagerSearchPane.exportJobRecursively({ jobId });
          });

          FileManager.writeToSeparateFile({
            readFileName: `*${testData.package.id}*_resource.csv`,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            // Check information matches "Package" record
            const { PackageId, PackageName } = data[0];

            cy.expect(PackageId).to.equal(testData.package.id);
            cy.expect(PackageName).to.equal(testData.package.name);
          });

          FileManager.writeToSeparateFile({
            readFileName: `*${testData.package.id}*_resource.csv`,
            writeFileName: testData.titleData,
            lines: [2],
          });
          FileManager.convertCsvToJson(testData.titleData).then((data) => {
            // Check number of rows
            cy.expect(data.length).to.equal(1);

            // Check title
            cy.expect(data[0].TitleName).to.equal(testData.recource.title);
          });
        });
      },
    );
  });
});
