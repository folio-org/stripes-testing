import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchQuery:
        'C773220 Dürer teoría técnicas Żabㅑtest! test@ test# test$ test% test^ test & (test) {test} [test] test.',
      authorityFields: [
        {
          tag: '100',
          content:
            '$a C773220 Dürer teoría técnicas Żabㅑtest! test@ test# test$ test% test^ test & (test) {test} [test] test.',
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
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C773220*');

      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (userProperties) => {
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
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      MarcAuthority.deleteViaAPI(testData.createdRecordId, true);
      Users.deleteViaApi(testData.userProperties.userId);
      FileManager.deleteFileFromDownloadsByMask('SearchAuthorityUUIDs*');
    });

    it(
      'C773220 Save authority UUIDs when search query contains special characters and diacritics (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C773220'] },
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
          },
        );
      },
    );
  });
});
