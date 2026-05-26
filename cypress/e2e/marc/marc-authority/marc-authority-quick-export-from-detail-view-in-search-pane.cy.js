import { APPLICATION_NAMES } from '../../../support/constants';
import { getLongDelay } from '../../../support/utils/cypressTools';
import Permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Result list / sorting', () => {
      describe('Export records', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          authData: {
            prefix: '',
            startWithNumber: `466299${randomNDigitNumber(15)}`,
          },
          authorityHeading: `AT_C466299_MarcAuthority_${randomPostfix}`,
          expectedActions: ['Export (MARC)', 'Print'],
        };

        let createdRecordId;
        let exportedMarcFile;
        const csvFileName = `AT_C466299_quickExportCSV_${randomPostfix}.csv`;

        before('Create user and test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C466299_');

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]).then((userProperties) => {
            testData.userProperties = userProperties;

            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.authData.prefix,
              testData.authData.startWithNumber,
              [
                {
                  tag: '100',
                  content: `$a ${testData.authorityHeading}`,
                  indicators: ['1', '\\'],
                },
              ],
            ).then((recordId) => {
              createdRecordId = recordId;

              cy.login(userProperties.username, userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.wait(3000);
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(createdRecordId, true);
          Users.deleteViaApi(testData.userProperties.userId);
          FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
          FileManager.deleteFileFromDownloadsByMask('QuickAuthorityExport*');
          FileManager.deleteFileFromDownloadsByMask(exportedMarcFile);
        });

        it(
          'C466299 Quick export of "MARC authority" record from authority detail view opened in the search pane (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C466299'] },
          () => {
            // Step 1: Search returns records
            MarcAuthorities.searchBeats(testData.authorityHeading);

            // Step 2: Click on heading → detail view opens in third pane
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();

            // Step 3: Click Actions in detail view → verify "Export (MARC)" and "Print" options
            MarcAuthority.checkActionDropdownContent(testData.expectedActions);

            // Step 4: Click "Export (MARC)" → toast notification appears, CSV downloaded
            cy.intercept('/data-export/quick-export').as('quickExport');
            MarcAuthority.clickExportMarcOption();
            MarcAuthorities.verifyToastNotificationAfterExportAuthority();
            cy.wait('@quickExport', getLongDelay()).then(({ response }) => {
              const jobHrId = response.body.jobExecutionHrId;
              exportedMarcFile = `quick-export-${jobHrId}.mrc`;

              // Step 5: CSV file contains the same UUID as the authority's 999 ff $i subfield
              ExportFile.downloadCSVFile(csvFileName, 'QuickAuthorityExport*');
              FileManager.readFile(`cypress/fixtures/${csvFileName}`).then((fileContent) => {
                const cleanContent = fileContent.trim().replace(/^"|"$/g, '');
                expect(cleanContent).to.equal(createdRecordId);
              });

              // Steps 6-7: Go to Data Export, download and verify the .mrc file
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
              DataExportLogs.waitLoading();
              DataExportLogs.clickButtonWithText(exportedMarcFile);
              ExportFile.verifyFileIncludes(
                exportedMarcFile,
                [testData.authorityHeading, createdRecordId],
                true,
              );
            });
          },
        );
      });
    });
  });
});
