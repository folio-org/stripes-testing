import {
  APPLICATION_NAMES,
  EHOLDINGS_PACKAGE_HEADERS,
  EHOLDINGS_TITLE_HEADERS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsPackageView,
  EHoldingsPackages,
  EHoldingsPackagesSearch,
} from '../../../support/fragments/eholdings';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

// Fields that may carry more than one value - multiple values are separated by " | " (pipe),
// never by "; " (semicolon)
const PACKAGE_MULTI_VALUE_FIELDS = [
  'Managed Alternative Names',
  'Custom Alternative Names',
  'Package Tags',
  'Package Agreements',
  'Package Note',
];
const TITLE_MULTI_VALUE_FIELDS = [
  'Alternate Titles',
  'Contributors',
  'ISSN Print',
  'ISSN Online',
  'ISBN Print',
  'ISBN Online',
  'Subjects',
  'Title Tags',
  'Title Agreements',
  'Title Note',
];

const verifyNoSemicolonSeparatedValues = (row, fieldNames) => {
  fieldNames.forEach((fieldName) => {
    if (row[fieldName]) {
      cy.expect(row[fieldName]).to.not.include('; ');
    }
  });
};

// Guards against a false-negative: without this, verifyNoSemicolonSeparatedValues would still
// pass even if every multi-value field were empty or single-valued, silently never exercising
// the " | " separator at all
const verifyAtLeastOnePipeSeparatedValue = (row, fieldNames) => {
  const hasPipeSeparatedValue = fieldNames.some((fieldName) => row[fieldName]?.includes(' | '));
  cy.expect(
    hasPipeSeparatedValue,
    `At least one of [${fieldNames.join(', ')}] should contain " | "`,
  ).to.equal(true);
};

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      package: {
        status: 'Selected',
      },
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken(false);
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.exportManagerAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: `${TopMenu.eholdingsPath}?searchType=packages`,
          waiter: EHoldingsPackages.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        FileManager.deleteFileFromDownloadsByMask(`*${testData.package.id}*_resource.csv`);
        FileManager.deleteFileFromDownloadsByMask(testData.packageData);
        FileManager.deleteFileFromDownloadsByMask(testData.titleData);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C354001 Export of selected “Package+Title” with all fields of “Package” and “Title” selected by default settings (promin) (TaaS)',
      { tags: ['criticalPath', 'promin', 'C354001'] },
      () => {
        // Steps 1-2: Fill in the search query, click "Search"
        EHoldingsPackagesSearch.byName('Wiley Online Library');
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Step 3: "Selection status" accordion shows All/Selected/Not selected options
        EHoldingsPackagesSearch.verifySelectionStatusOptions(['All', 'Selected', 'Not selected']);

        // Step 4: Click on the "Selected" status
        EHoldingsPackagesSearch.bySelectionStatus(testData.package.status);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();

        EHoldingsPackages.sortPackagesByTitlesCount().then((packages) => {
          const packagesSelectedEqualTotalTitles = packages.filter(
            (pack) => pack.countSelected === pack.countTotalTitles,
          );
          testData.package.id = packagesSelectedEqualTotalTitles[0].id;
          testData.package.name = packagesSelectedEqualTotalTitles[0].name;
          testData.package.titles = packagesSelectedEqualTotalTitles[0].countTotalTitles;

          testData.packageData = `package_data_${testData.package.id}.csv`;
          testData.titleData = `title_data_${testData.package.id}.csv`;
          testData.package.customAltNames = ['aaa', 'bbb'];

          // Set deterministic multi-value data on "Custom Alternative Names" so the exported
          // "Package" row has a known, guaranteed " | "-separated value to check exactly. This
          // package is real/shared data, not created by this test, so the previous value is
          // captured here and restored in the "after" hook
          cy.getAdminToken(false);
          EHoldingsPackages.setCustomAltNamesViaApi(
            testData.package.id,
            testData.package.customAltNames.map((altName) => ({ altName })),
          ).then((previousCustomAltNames) => {
            testData.package.previousCustomAltNames = previousCustomAltNames;
            cy.getToken(testData.user.username, testData.user.password);

            // Step 5: View "Package" record with "Total titles" value more than 1
            EHoldingsPackages.openPackageWithExpectedName(testData.package.name);
            EHoldingsPackageView.verifyPackageDetailViewIsOpened(
              testData.package.name,
              testData.package.titles,
              testData.package.status,
            );

            // Step 6: Click title record with "Selected" status from the 'Titles' section
            const EHoldingsResourceView = EHoldingsPackageView.selectTitleRecord();
            EHoldingsResourceView.getResourceDetails().then((details) => {
              testData.recource = details;
            });

            // Step 7: Actions > "Export title package (CSV)" - openExportModal() verifies the
            // "Export settings" modal content (message, both field sections, radios, buttons)
            const ExportSettingsModal = EHoldingsResourceView.openExportModal();

            // Step 8: click "Export" - clickExportButton() verifies the modal closes and the
            // success toast (with Job ID) is shown; then confirm we're back on the Title view
            ExportSettingsModal.clickExportButton();
            EHoldingsResourceView.waitLoading();

            EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
              // Step 9: Go to "Export manager" app
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);

              // Step 10: check the "eHoldings" checkbox inside "Job type" accordion
              ExportManagerSearchPane.searchByEHoldings();

              // Step 11: verify the job row - Job ID, Status, Job type, Source all in one row
              ExportManagerSearchPane.verifyJobDataInResults([
                jobId,
                'Successful',
                'eHoldings',
                testData.user.username,
              ]);

              // Step 12: download the exported ".csv" file by clicking the "Job ID" hyperlink
              ExportManagerSearchPane.exportJobRecursively({ jobId });

              // Verify the downloaded file name matches "..._<<resourceId>>_resource.csv" - must
              // run inside this callback (after the download actually completes) and after
              // downloadTimeout, otherwise the file may not exist on disk yet
              cy.wait(Cypress.env('downloadTimeout'));
              FileManager.findDownloadedFilesByMask(`*${testData.package.id}*_resource.csv`).then(
                (files) => {
                  const lastDownloadedFile = files.sort()[files.length - 1];
                  EHoldingsResourceView.verifyPackagesResourceExportedFileName(lastDownloadedFile);
                },
              );
            });

            FileManager.writeToSeparateFile({
              readFileName: `*${testData.package.id}*_resource.csv`,
              writeFileName: testData.packageData,
              lines: [0, 2],
            });
            FileManager.convertCsvToJson(testData.packageData).then((data) => {
              // Step 13: "Package" row - known values, and every expected column is present
              cy.expect(data[0]['Package Id']).to.equal(testData.package.id);
              cy.expect(data[0]['Package Name']).to.equal(testData.package.name);
              cy.expect(data[0]['Package Holdings Status']).to.equal(testData.package.status);
              cy.expect(data[0]['Custom Alternative Names']).to.equal(
                testData.package.customAltNames.join(' | '),
              );
              EHOLDINGS_PACKAGE_HEADERS.forEach((header) => {
                cy.expect(data[0]).to.have.property(header);
              });
              verifyNoSemicolonSeparatedValues(data[0], PACKAGE_MULTI_VALUE_FIELDS);
            });

            FileManager.writeToSeparateFile({
              readFileName: `*${testData.package.id}*_resource.csv`,
              writeFileName: testData.titleData,
              lines: [2],
            });
            FileManager.convertCsvToJson(testData.titleData).then((data) => {
              // Step 13: "Title" row - known values, and every expected column is present
              cy.expect(data.length).to.equal(1);
              cy.expect(data[0]['Title Name']).to.equal(testData.recource.title);
              cy.expect(data[0]['Title Holdings Status']).to.equal(testData.package.status);
              EHOLDINGS_TITLE_HEADERS.forEach((header) => {
                cy.expect(data[0]).to.have.property(header);
              });
              // Multi-value fields (e.g. Contributors, ISBN Online, Subjects) must use " | " -
              // never ";" - to separate multiple values within the same field
              verifyNoSemicolonSeparatedValues(data[0], TITLE_MULTI_VALUE_FIELDS);
              verifyAtLeastOnePipeSeparatedValue(data[0], TITLE_MULTI_VALUE_FIELDS);
            });
          });
        });
      },
    );
  });
});
