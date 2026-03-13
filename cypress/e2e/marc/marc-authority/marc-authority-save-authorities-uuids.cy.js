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
      searchQuery: 'C773218 Twain',
      authorityFields: [
        {
          tag: '100',
          content: '$a C773218 Twain, Mark, $d 1835-1910.',
          indicators: ['1', '\\'],
        },
      ],
      authData: {
        prefix: getRandomLetters(5),
        startWithNumber: '1',
      },
    };
    let downloadedUUIDFile;

    before('Create user and test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C773218*');

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
      FileManager.deleteFileFromDownloadsByMask('SearchAuthorityUUIDs*');
    });

    it(
      'C773218 Save authority UUIDs (1 record) (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C773218'] },
      () => {
        MarcAuthoritiesSearch.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, testData.searchQuery);
        MarcAuthorities.checkResultsListRecordsCount();

        MarcAuthorities.clickActionsButton();
        MarcAuthorities.clickSaveUuidsButton();

        FileManager.findDownloadedFilesByMask('SearchAuthorityUUIDs*').then(
          (downloadedFilePaths) => {
            const lastDownloadedFilePath =
              downloadedFilePaths.sort()[downloadedFilePaths.length - 1];
            downloadedUUIDFile = FileManager.getFileNameFromFilePath(lastDownloadedFilePath);

            FileManager.readFile(`cypress/downloads/${downloadedUUIDFile}`).then((fileContent) => {
              const cleanContent = fileContent.trim().replace(/^"|"$/g, '');
              expect(cleanContent).to.equal(testData.createdRecordId);
            });

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();
            DataExportLogs.verifyJobAbsentInLogs(downloadedUUIDFile);
          },
        );
      },
    );
  });
});
