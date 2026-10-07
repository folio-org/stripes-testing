import {
  APPLICATION_NAMES,
  EHOLDINGS_PACKAGE_HEADERS,
  EHOLDINGS_TITLE_HEADERS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import Agreements from '../../../support/fragments/agreements/agreements';
import {
  EHoldingsPackageView,
  EHoldingsPackages,
  EHoldingsPackagesSearch,
  EHoldingsTitles,
} from '../../../support/fragments/eholdings';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import ExportSettingsModal from '../../../support/fragments/eholdings/modals/exportSettingsModal';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

// Asserts a field has exactly the expected number of " | "-separated values (never ";"). Each
// expected value is checked as a substring of one of the segments (rather than an exact
// segment match), since e.g. agreement entries are composite values like
// "<startDate>;<agreementName>;<status>", not just the agreement's name.
const verifyPipeSeparatedValues = (row, fieldName, expectedValues) => {
  expect(row[fieldName], `${fieldName} exists`).to.not.equal(undefined);
  const actualValues = row[fieldName].split(' | ');
  expect(actualValues.length, `${fieldName} value count`).to.equal(expectedValues.length);
  expectedValues.forEach((value) => {
    expect(
      actualValues.some((actual) => actual.includes(value)),
      `${fieldName} contains "${value}"`,
    ).to.equal(true);
  });
};

describe('eHoldings', () => {
  describe('Package', () => {
    const postfix = getRandomPostfix();
    // 3 tags/agreements, paired so Package and Title share one value but differ on the other -
    // this proves the two columns are populated independently, not just mirroring each other
    const allTags = [
      `at_c1538610_tag1_${postfix}`,
      `at_c1538610_tag2_${postfix}`,
      `at_c1538610_tag3_${postfix}`,
    ];
    const allAgreementNames = [
      `AT_C1538610_Agreement1_${postfix}`,
      `AT_C1538610_Agreement2_${postfix}`,
      `AT_C1538610_Agreement3_${postfix}`,
    ];
    const testData = {
      packageName: `AT_C1538610_Package_${postfix}`,
      titleName: `AT_C1538610_Title_${postfix}`,
      customAltNames: [`AT_C1538610_AltName1_${postfix}`, `AT_C1538610_AltName2_${postfix}`],
      titleTags: [allTags[0], allTags[1]],
      packageTags: [allTags[0], allTags[2]],
      titleAgreementNames: [allAgreementNames[0], allAgreementNames[1]],
      packageAgreementNames: [allAgreementNames[0], allAgreementNames[2]],
      allAgreementNames,
      fileName: `C1538610autoTestFile${postfix}.csv`,
      fileMask: '*_package.csv',
      packageData: `C1538610_package_data_${postfix}.csv`,
      titleData: `C1538610_title_data_${postfix}.csv`,
      tagIds: [],
      agreementIds: [],
    };
    const calloutMessage =
      'is in progress and will be available on the Export manager app. The export may take several minutes to complete.';

    before('Create custom package with multi-valued fields', () => {
      cy.getAdminToken();

      EHoldingsPackages.createPackageViaAPI({
        data: {
          type: 'packages',
          attributes: { name: testData.packageName, contentType: 'E-Book' },
        },
      }).then(({ data }) => {
        testData.packageId = data.id;

        EHoldingsPackages.setCustomAltNamesViaApi(
          testData.packageId,
          testData.customAltNames.map((altName) => ({ altName })),
        );

        // TO DO: uncomment when this is fixed: https://folio-org.atlassian.net/browse/UIEH-1553
        // cy.addTagsToEHoldingsEntityApi({
        //   entityId: testData.packageId,
        //   entityName: testData.packageName,
        //   tags: testData.packageTags,
        //   isPackage: true,
        // });

        EHoldingsTitles.createEHoldingTitleVIaApi({
          packageId: testData.packageId,
          titleName: testData.titleName,
        }).then((title) => {
          testData.titleId = title.id;

          EHoldingsTitles.getTitleByIdViaApi(testData.titleId, {
            searchParams: { include: 'resources' },
          }).then(({ body }) => {
            testData.resourceId = body.included[0].id;

            cy.addTagsToEHoldingsEntityApi({
              entityId: testData.resourceId,
              entityName: testData.titleName,
              tags: testData.titleTags,
            });

            testData.allAgreementNames.forEach((agreementName) => {
              Agreements.createViaApi({
                ...Agreements.defaultAgreement,
                name: agreementName,
              }).then((agreement) => {
                testData.agreementIds.push(agreement.id);

                if (testData.packageAgreementNames.includes(agreementName)) {
                  cy.linkEHoldingsEntityToAgreementApi({
                    agreementId: agreement.id,
                    resourceId: testData.packageId,
                    agreementName,
                    resourceName: testData.packageName,
                    isPackage: true,
                  });
                }

                if (testData.titleAgreementNames.includes(agreementName)) {
                  cy.linkEHoldingsEntityToAgreementApi({
                    agreementId: agreement.id,
                    resourceId: testData.resourceId,
                    agreementName,
                    resourceName: testData.titleName,
                  });
                }
              });
            });
          });
        });
      });

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
        testData.agreementIds.forEach((agreementId) => Agreements.deleteViaApi(agreementId));
        testData.tagIds.forEach((tagId) => cy.deleteTagApi(tagId, true));
        EHoldingsTitles.deleteTitleByIdViaApi(testData.titleId);
        EHoldingsPackages.deletePackageViaAPI(testData.packageName);
        FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
        FileManager.deleteFileFromDownloadsByMask(testData.fileMask);
        FileManager.deleteFileFromDownloadsByMask(testData.packageData);
        FileManager.deleteFileFromDownloadsByMask(testData.titleData);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C1538610 Custom Package CSV export uses pipe separator for multi-value fields (promin)',
      { tags: ['criticalPath', 'promin', 'C1538610'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.openPackageWithExpectedName(testData.packageName);
        EHoldingsPackageView.waitLoading();

        // Step 1: Actions > "Export package (CSV)" - openExportModal() verifies the modal
        // content (both field sections, radios, buttons, Export enabled)
        EHoldingsPackageView.openExportModal();

        // Step 2: click "Export" - clickExportButton() verifies the modal closes; then confirm
        // we're back on the Custom Package detail view with the success toast (with Job ID)
        ExportSettingsModal.clickExportButton();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyCalloutMessage(calloutMessage);

        EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
          // Step 3-4: Export manager - check the "eHoldings" checkbox inside "Job type"
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
          ExportManagerSearchPane.searchByEHoldings();

          // Step 5: verify the job row - Job ID, Status, Job type, Source
          // Step 6: download the exported ".csv" file, verify its name format
          ExportManagerSearchPane.exportJobRecursively({ jobId });
          ExportManagerSearchPane.verifyJobDataInResults([
            jobId,
            'Successful',
            'eHoldings',
            testData.user.username,
          ]);
          ExportFile.downloadCSVFile(testData.fileName, testData.fileMask);

          FileManager.verifyFile(
            ExportManagerSearchPane.verifyExportedFileName,
            testData.fileMask,
            ExportManagerSearchPane.verifyContentOfExportFile,
            [testData.packageName],
          );

          // Step 7: "Package" row (first row) - all expected columns present, and multi-value
          // fields use " | " with the exact values set up above
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            const missingPackageHeaders = EHOLDINGS_PACKAGE_HEADERS.filter(
              (header) => !(header in data[0]),
            );
            expect(missingPackageHeaders, 'Missing Package CSV columns').to.have.length(0);

            cy.expect(data[0]['Package Name']).to.equal(testData.packageName);
            verifyPipeSeparatedValues(data[0], 'Custom Alternative Names', testData.customAltNames);
            // TO DO: uncomment when this is fixed: https://folio-org.atlassian.net/browse/UIEH-1553
            // verifyPipeSeparatedValues(data[0], 'Package Tags', testData.packageTags);
            verifyPipeSeparatedValues(
              data[0],
              'Package Agreements',
              testData.packageAgreementNames,
            );
          });

          // Step 7: "Title" row (third row) - all expected columns present, and multi-value
          // fields use " | " with the exact values set up above
          FileManager.writeToSeparateFile({
            readFileName: testData.fileMask,
            writeFileName: testData.titleData,
            lines: [2],
          });
          FileManager.convertCsvToJson(testData.titleData).then((data) => {
            cy.expect(data.length).to.equal(1);
            const missingTitleHeaders = EHOLDINGS_TITLE_HEADERS.filter(
              (header) => !(header in data[0]),
            );
            expect(missingTitleHeaders, 'Missing Title CSV columns').to.have.length(0);

            cy.expect(data[0]['Title Name']).to.equal(testData.titleName);
            verifyPipeSeparatedValues(data[0], 'Title Tags', testData.titleTags);
            verifyPipeSeparatedValues(data[0], 'Title Agreements', testData.titleAgreementNames);
          });
        });
      },
    );
  });
});
