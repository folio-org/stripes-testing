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
import ArrayUtils from '../../../support/utils/arrays';
import FileManager from '../../../support/utils/fileManager';

describe('eHoldings', () => {
  describe('Package', () => {
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
        FileManager.deleteFileFromDownloadsByMask(`*${testData.package.id}_package.csv`);
        FileManager.deleteFileFromDownloadsByMask(testData.packageData);
        FileManager.deleteFileFromDownloadsByMask(testData.titleData);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C354000 Export all selected titles in a "Package". Export all "Package" and "Titles" fields selected by default settings (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        // Fill in the input field with the search query, Click on the "Search" button.
        EHoldingsPackagesSearch.byName('Book');
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

          // Click on the "Actions" button, Select "Export package (CSV)" option.
          const ExportSettingsModal = EHoldingsPackageView.openExportModal();

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
            readFileName: `*${testData.package.id}_package.csv`,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            // Check information matches "Package" record
            cy.expect(testData.package.id === data.PackageId);
            cy.expect(testData.package.name === data.PackageName);
          });

          FileManager.writeToSeparateFile({
            readFileName: `*${testData.package.id}_package.csv`,
            writeFileName: testData.titleData,
            lines: [2],
          });
          FileManager.convertCsvToJson(testData.titleData).then((data) => {
            const titleNames = data.map(({ TitleName }) => TitleName);

            // Check number of rows
            cy.expect(data.length).to.equal(testData.package.titles);

            // Check information is sorted by "Title name" column in alphabetical order
            cy.expect(ArrayUtils.checkIsSortedAlphabetically({ array: titleNames })).to.equal(true);

            // Check the "Title name" coulmn doesn't have empty cells
            cy.expect(titleNames.every((titleName) => !!titleName)).to.equal(true);
          });
        });
      },
    );
  });
});
