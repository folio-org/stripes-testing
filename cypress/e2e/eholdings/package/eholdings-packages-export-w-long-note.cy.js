import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsPackages,
  EHoldingsPackagesSearch,
  EHoldingsPackageView,
} from '../../../support/fragments/eholdings';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import Notes from '../../../support/fragments/notes/notes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import ArrayUtils from '../../../support/utils/arrays';
import FileManager from '../../../support/utils/fileManager';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { NOTE_TYPES, APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe.skip('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      package: {
        status: 'Selected',
      },
      note: {
        title: `autotest_note_tile [${randomFourDigitNumber()}]`,
        type: NOTE_TYPES.GENERAL,
      },
      user: {},
    };

    before('Create test data', () => {
      const fileName = 'cypress/fixtures/C357529_note_details.txt';
      FileManager.readFile(fileName).then((details) => {
        testData.note.details = details;
      });

      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uiAgreementsSearch.gui,
        Permissions.uiNotesAssignUnassign.gui,
        Permissions.uiNotesItemCreate.gui,
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
      cy.getAdminToken().then(() => {
        FileManager.deleteFileFromDownloadsByMask(`*${testData.package.id}_package.csv`);
        FileManager.deleteFileFromDownloadsByMask(testData.packageData);
        FileManager.deleteFileFromDownloadsByMask(testData.titleData);
        Notes.deleteNotesForEHoldingViaApi(testData.package.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C357529 Export all "Titles" (less than 10k) of "Package" record with large "Note" (around 4k symbols). (spitfire) (TaaS)',
      { tags: ['criticalPathBroken', 'spitfire', 'C357529'] },
      () => {
        // Fill in the input field with the search query, Click on the "Search" button.
        EHoldingsPackagesSearch.byName('Cambridge');
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        // Click on the "Selection status" accordion, Click on the "Selected" status.
        EHoldingsPackagesSearch.bySelectionStatus(testData.package.status);
        EHoldingsPackages.verifyOnlySelectedPackagesInResults();

        // Open "Package" record which has titles not more than 10 000, and not less than 9 000.
        EHoldingsPackages.sortPackagesByTitlesCount({ minTitlesCount: 9000 }).then((packages) => {
          testData.package.id = packages[0].id;
          testData.package.name = packages[0].name;
          testData.package.titles = packages[0].countTotalTitles;

          testData.packageData = `package_data_${testData.package.id}.csv`;
          testData.titleData = `title_data_${testData.package.id}.csv`;

          // Package should not contain any note for successfull pass
          Notes.deleteNotesForEHoldingViaApi(testData.package.id);

          // View "Package" record with "Total titles" value more than 1.
          EHoldingsPackages.openPackageWithExpectedName(testData.package.name);
          EHoldingsPackageView.verifyPackageDetailViewIsOpened(
            testData.package.name,
            testData.package.titles,
            testData.package.status,
          );

          // Verify "Package" record doesn't have assigned "Notes" records.
          EHoldingsPackageView.checkNotesSectionContent();

          // Click on the "New" button under "Notes" accordion.
          const NoteEditForm = EHoldingsPackageView.openAddNewNoteForm();

          // Fill in the "General information" of new note.
          NoteEditForm.fillNoteFields(testData.note);

          // Click on the "Save & close" button.
          NoteEditForm.saveNote();
          EHoldingsPackageView.checkNotesSectionContent([testData.note]);

          // Click on the "Actions" button, Select "Export package (CSV)" option.
          const ExportSettingsModal = EHoldingsPackageView.openExportModal();

          // Click on the "Export" button.
          ExportSettingsModal.clickExportButton();

          EHoldingsPackageView.getJobIDFromCalloutMessage().then((jobId) => {
            // Go to "Export manager" app.
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);

            // Verify row with "Job ID" displayed at export jobs list.
            ExportManagerSearchPane.searchByEHoldings();
            ExportManagerSearchPane.verifyResult(jobId);

            // Download the exported ".csv" file by clicking on the "Job ID" hyperlink.
            ExportManagerSearchPane.exportJobRecursively({ jobId });

            // could take some time to download big file
            cy.wait(30000);
          });

          FileManager.writeToSeparateFile({
            readFileName: `*${testData.package.id}_package.csv`,
            writeFileName: testData.packageData,
            lines: [0, 2],
          });
          FileManager.convertCsvToJson(testData.packageData).then((data) => {
            // Check information matches "Package" record
            const expectedPackageNote = `${testData.note.type};${
              testData.note.title
            };<p>${testData.note.details.replace(/\n/g, '')}</p>`;

            cy.expect(data[0]['Package Id']).to.equal(testData.package.id);
            cy.expect(data[0]['Package Name']).to.equal(testData.package.name);
            cy.expect(data[0]['Package Note 1'].replace(/\\n/g, '')).to.include(
              expectedPackageNote,
            );
          });

          FileManager.writeToSeparateFile({
            readFileName: `*${testData.package.id}_package.csv`,
            writeFileName: testData.titleData,
            lines: [2],
          });
          FileManager.convertCsvToJson(testData.titleData).then((data) => {
            const titleNames = data.map(({ 'Title Name': TitleName }) => TitleName);

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
