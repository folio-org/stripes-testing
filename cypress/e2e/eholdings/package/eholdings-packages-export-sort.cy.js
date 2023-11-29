import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import { AssignedUsers } from '../../../support/fragments/settings/eholdings';
import { EHoldingsPackage, EHoldingsPackageView } from '../../../support/fragments/eholdings';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import ArrayUtils from '../../../support/utils/arrays';
import FileManager from '../../../support/utils/fileManager';

describe('eHoldings', () => {
  const testData = {
    user: {},
  };

  before('Create test user', () => {
    cy.createTempUser([
      Permissions.moduleeHoldingsEnabled.gui,
      Permissions.uiAgreementsSearchAndView.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.exportManagerAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      AssignedUsers.assignUserToDefaultCredentialsViaApi({ userId: testData.user.userId });
    });
  });

  after('Delete test user', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
    });
  });

  describe('Package', () => {
    const packageId = '22-2163800';
    const packageName = 'Business Premium Collection';

    before('Create test data', () => {
      testData.packageData = `package_data_${packageId}.csv`;
      testData.titleData = `title_data_${packageId}.csv`;

      cy.login(testData.user.username, testData.user.password, {
        path: `${TopMenu.eholdingsPath}/packages/${packageId}`,
        waiter: () => EHoldingsPackage.waitLoading(packageName),
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FileManager.deleteFileFromDownloadsByMask(`*${packageId}_package.csv`);
        FileManager.deleteFileFromDownloadsByMask(testData.packageData);
        FileManager.deleteFileFromDownloadsByMask(testData.titleData);
      });
    });

    it(
      'C366590 Verify that rows in exported ".csv" file are sorted alphabetically (case insensitive) by "Title name" column (scenario 2) (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        EHoldingsPackageView.getTotalTitlesCount().then((titlesCount) => {
          testData.titlesCount = titlesCount;
        });

        // Click "Actions" button, Select "Export package (CSV)", Click "Export" button.
        const ExportSettingsModal = EHoldingsPackageView.openExportModal();
        ExportSettingsModal.clickExportButton();

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          // Go to "Export manager" app
          cy.visit(TopMenu.exportManagerPath);

          // Verify row with "Job ID" displayed at export jobs list.
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);

          // Download the exported ".csv" file by clicking on the "Job ID" hyperlink.
          ExportManagerSearchPane.exportJobRecursively({ jobId });
        });

        FileManager.writeToSeparateFile({
          readFileName: `*${packageId}_package.csv`,
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
          readFileName: `*${packageId}_package.csv`,
          writeFileName: testData.titleData,
          lines: [2],
        });
        FileManager.convertCsvToJson(testData.titleData).then((data) => {
          const titleNames = data.map(({ TitleName }) => TitleName);

          // Check number of rows
          cy.expect(data.length).to.equal(testData.titlesCount);

          // Check information is sorted by "Title name" column in alphabetical order
          cy.expect(ArrayUtils.checkIsSortedAlphabetically({ array: titleNames })).to.equal(true);

          // Check the "Title name" coulmn doesn't have empty cells
          cy.expect(titleNames.every((titleName) => !!titleName)).to.equal(true);
        });
      },
    );
  });

  describe('Package', () => {
    const packageId = '125531-2631932';
    const packageName = 'VLeBooks';

    before('Create test data', () => {
      testData.packageData = `package_data_${packageId}.csv`;
      testData.titleData = `title_data_${packageId}.csv`;

      cy.login(testData.user.username, testData.user.password, {
        path: `${TopMenu.eholdingsPath}/packages/${packageId}`,
        waiter: () => EHoldingsPackage.waitLoading(packageName),
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FileManager.deleteFileFromDownloadsByMask(`*${packageId}_package.csv`);
        FileManager.deleteFileFromDownloadsByMask(testData.packageData);
        FileManager.deleteFileFromDownloadsByMask(testData.titleData);
      });
    });

    it(
      'C366591 Verify that rows in exported ".csv" file are sorted alphabetically (case insensitive) by "Title name" column (scenario 1) (spitfire) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        // Click the "Search" button in "Titles" accordion
        const FilterTitlesModal = EHoldingsPackageView.openFilterTitlesModal();

        // Decrease the number of "Titles" found by using filter.
        FilterTitlesModal.typeSearchQuery('Australia');
        FilterTitlesModal.clickSearchButton();

        EHoldingsPackageView.getFilteredTitlesCount().then((titlesCount) => {
          testData.titlesCount = titlesCount;
        });

        // Click "Actions" button, Select "Export package (CSV)", Click "Export" button.
        const ExportSettingsModal = EHoldingsPackageView.openExportModal();
        ExportSettingsModal.clickExportButton();

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          // Go to "Export manager" app
          cy.visit(TopMenu.exportManagerPath);

          // Verify row with "Job ID" displayed at export jobs list.
          ExportManagerSearchPane.searchByEHoldings();
          ExportManagerSearchPane.verifyResult(jobId);

          // Download the exported ".csv" file by clicking on the "Job ID" hyperlink.
          ExportManagerSearchPane.exportJobRecursively({ jobId });
        });

        FileManager.writeToSeparateFile({
          readFileName: `*${packageId}_package.csv`,
          writeFileName: testData.packageData,
          lines: [0, 2],
        });
        FileManager.convertCsvToJson(testData.packageData).then((data) => {
          // Check information matches "Package" record
          cy.expect(packageId === data.PackageId);
          cy.expect(packageName === data.PackageName);
        });

        FileManager.writeToSeparateFile({
          readFileName: `*${packageId}_package.csv`,
          writeFileName: testData.titleData,
          lines: [2],
        });
        FileManager.convertCsvToJson(testData.titleData).then((data) => {
          const titleNames = data.map(({ TitleName }) => TitleName);

          // Check number of rows
          cy.expect(data.length).to.equal(testData.titlesCount);

          // Check information is sorted by "Title name" column in alphabetical order
          cy.expect(ArrayUtils.checkIsSortedAlphabetically({ array: titleNames })).to.equal(true);

          // Check the "Title name" coulmn doesn't have empty cells
          cy.expect(titleNames.every((titleName) => !!titleName)).to.equal(true);
        });
      },
    );
  });
});
