import { APPLICATION_NAMES, MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import Permissions from '../../../../support/dictionary/permissions';
import DataExportLogs from '../../../../support/fragments/data-export/dataExportLogs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityFields: [
          {
            tag: '100',
            content: '$a C466301 Twain, Mark, $d 1835-1910.',
            indicators: ['1', '\\'],
          },
        ],
        authData: {
          prefix: 'C466301',
          startWithNumber: '1',
        },
        authorityHeading: 'C466301 Twain, Mark, 1835-1910.',
        browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
        expectedActions: ['Export (MARC)', 'Print'],
      };

      let createdRecordId;
      let exportedMarcFile;
      const csvFileName = `C466301_quickExportCSV_${randomPostfix}.csv`;

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C466301*');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          testData.userProperties = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.authData.prefix,
            testData.authData.startWithNumber,
            testData.authorityFields,
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
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdRecordId, true);
        Users.deleteViaApi(testData.userProperties.userId);
        FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
        FileManager.deleteFileFromDownloadsByMask('QuickAuthorityExport*');
        FileManager.deleteFileFromDownloadsByMask(exportedMarcFile);
      });

      it(
        'C466301 Quick export of "MARC authority" record from authority detail view opened in the browse pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466301'] },
        () => {
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(testData.browseOption, testData.authorityHeading);

          MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.checkActionDropdownContent(testData.expectedActions);

          cy.intercept('/data-export/quick-export').as('quickExport');
          MarcAuthority.clickExportMarcOption();
          MarcAuthorities.verifyToastNotificationAfterExportAuthority();
          cy.wait('@quickExport', getLongDelay()).then(({ response }) => {
            const jobHrId = response.body.jobExecutionHrId;
            exportedMarcFile = `quick-export-${jobHrId}.mrc`;

            ExportFile.downloadCSVFile(csvFileName, 'QuickAuthorityExport*');

            FileManager.readFile(`cypress/fixtures/${csvFileName}`).then((fileContent) => {
              const cleanContent = fileContent.trim().replace(/^"|"$/g, '');
              expect(cleanContent).to.equal(createdRecordId);
            });

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();
            DataExportLogs.clickButtonWithText(exportedMarcFile);
            ExportFile.verifyFileIncludes(exportedMarcFile, ['C466301 Twain, Mark,']);
          });
        },
      );
    });
  });
});
