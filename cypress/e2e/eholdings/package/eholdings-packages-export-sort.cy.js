import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import { AssignedUsers } from '../../../support/fragments/settings/eholdings';
import { EHoldingsPackage, EHoldingsPackageView } from '../../../support/fragments/eholdings';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import ArrayUtils from '../../../support/utils/arrays';
import FileManager from '../../../support/utils/fileManager';

describe('eHoldings', () => {
  describe('Package', () => {
    const packageId = '22-2163800';
    const testData = {
      package: {
        id: packageId,
        name: 'Business Premium Collection',
      },
      packageData: `package_data_${packageId}.csv`,
      titleData: `title_data_${packageId}.csv`,
      user: {},
    };

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.exportManagerAll.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;

          AssignedUsers.assignUserToDefaultCredentialsViaApi({ userId: testData.user.userId });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: `${TopMenu.eholdingsPath}/packages/${testData.package.id}`,
            waiter: () => EHoldingsPackage.waitLoading(testData.package.name),
          });

          EHoldingsPackageView.getTotalTitlesCount().then((titlesCount) => {
            testData.titlesCount = titlesCount;
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
      'C366590 Verify that rows in exported ".csv" file are sorted alphabetically (case insensitive) by "Title name" column (scenario 2) (spitfire) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        // Click "Actions" button, Select "Export package (CSV)", Click "Export" button.
        EHoldingsPackageView.openExportModal();
        EHoldingsPackageView.export();

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
          cy.expect(data.length === testData.titlesCount);

          // Check information is sorted by "Title name" column in alphabetical order
          cy.expect(ArrayUtils.checkIsSorted({ array: titleNames }));

          // Check the "Title name" coulmn doesn't have empty cells.
          cy.expect(titleNames.every((titleName) => !!titleName));
        });
      },
    );
  });
});
