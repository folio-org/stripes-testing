import { APPLICATION_NAMES, MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchQuery: 'C729552 Twain, Mark',
      authorityFields: [
        {
          tag: '100',
          content: '$a C729552 Twain, Mark, $d 1835-1910.',
          indicators: ['1', '\\'],
        },
      ],
      authData: {
        prefix: getRandomLetters(5),
        startWithNumber: '1',
      },
    };
    let downloadedCQLFile;

    before('Create user and test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C729552 Twain*');

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        testData.userProperties = userProperties;

        MarcAuthorities.createMarcAuthorityViaAPI(
          testData.authData.prefix,
          testData.authData.startWithNumber,
          testData.authorityFields,
        ).then((createdRecordId) => {
          testData.createdRecordId = createdRecordId;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      MarcAuthority.deleteViaAPI(testData.createdRecordId, true);
      Users.deleteViaApi(testData.userProperties.userId);
      FileManager.deleteFileFromDownloadsByMask('SearchAuthorityCQLQuery*');
    });

    it(
      'C729552 Save authorities CQL query (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C729552'] },
      () => {
        // Step 1: Search using Keyword option — results must be found
        MarcAuthoritiesSearch.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, testData.searchQuery);
        MarcAuthorities.checkResultsListRecordsCount();

        // Step 2: Click Actions → "Save authorities CQL query" and verify downloaded file name
        MarcAuthorities.clickActionsButton();
        MarcAuthorities.clickSaveCqlButton();

        FileManager.findDownloadedFilesByMask('SearchAuthorityCQLQuery*').then(
          (downloadedFilePaths) => {
            const lastDownloadedFilePath =
              downloadedFilePaths.sort()[downloadedFilePaths.length - 1];
            downloadedCQLFile = FileManager.getFileNameFromFilePath(lastDownloadedFilePath);

            expect(downloadedCQLFile).to.match(
              /^SearchAuthorityCQLQuery\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}\+\d{2}_\d{2}\.cql$/,
            );

            // Step 3: Open downloaded file and verify CQL content contains the search query
            FileManager.readFile(`cypress/downloads/${downloadedCQLFile}`).then((fileContent) => {
              expect(fileContent).to.include(`keyword all "${testData.searchQuery}"`);
              expect(fileContent).to.include(`naturalId=="${testData.searchQuery}"`);
              expect(fileContent).to.include(`identifiers.value=="${testData.searchQuery}"`);
            });

            // Step 4: Navigate to Data Export and verify no job exists with the downloaded file name
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();
            DataExportLogs.verifyJobAbsentInLogs(downloadedCQLFile);
          },
        );
      },
    );
  });
});
