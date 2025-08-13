import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      expectedProperties: [
        'authRefType',
        'headingRef',
        'headingType',
        'id',
        'naturalId',
        'sourceFileId',
      ],
      searchOptions: {
        keyword: 'Keyword',
        nameTitle: 'Name-title',
      },
      noResultsMessage: 'No results found for',
    };

    const searchQueriesC409449 = [
      'C409449',
      'C409449 Personal name-title 100 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn subb subc subf subk subl subm subn subo subp subq subr subs',
      'C409449 Corporate name-title 410 Indian Medical Degrees Act, 1916 subb subc subd subf subi subk subl subm subn subo subp subq subr subs title',
      'C409449 Conference Name-title 511 Mostly Chopin Orchestra subb subc subd subf subi subk subl subm subn subo subp subq subr subs subt',
      'C409449 Conference Name-title 111 Mostly Chopin Festival. sonet subb subc subd subf subk subl subm subn subo subp subq subr subs sub1',
      "C409449 Personal name-title 400 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn (Tom Sawyer's comrade) subb subc subf subi subk subl subm subn subo subp subq subr subs sub1",
      'C409449 Corporate name-title 510 Indian Medical Degrees subb subc subd subf subi subk subl subm subn subo subp subq subr subs sub1 title',
    ];

    const searchResultsDataC409449 = [
      ['Authorized', 'C409449 Personal name-title 100', 'Personal Name'],
      ['Reference', 'C409449 Personal name-title 400', 'Personal Name'],
      ['Auth/Ref', 'C409449 Personal name-title 500', 'Personal Name'],
      ['Authorized', 'C409449 Corporate name-title 110', 'Corporate Name'],
      ['Reference', 'C409449 Corporate name-title 410', 'Corporate Name'],
      ['Auth/Ref', 'C409449 Corporate name-title 510', 'Corporate Name'],
      ['Authorized', 'C409449 Conference Name-title 111', 'Conference Name'],
      ['Reference', 'C409449 Conference Name-title 411', 'Conference Name'],
      ['Auth/Ref', 'C409449 Conference Name-title 511', 'Conference Name'],
    ];

    const marcFiles = [
      {
        marc: 'marcAuthFileC360532.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        authorityHeading: 'C360532 Cartoons & Comics',
        numberOfRecors: 1,
        propertyName: 'authority',
      },
      {
        marc: 'marcAuthFileC409449.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numberOfRecors: 17,
        propertyName: 'authority',
      },
    ];

    const createdRecordIDs = [];

    before('Creating user, importing record', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C409449*');
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties2) => {
            testData.userPropertiesC409449 = createdUserProperties2;
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
          },
        );
      });
    });

    after('Deleting user, record', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      Users.deleteViaApi(testData.userPropertiesC409449.userId);
      createdRecordIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });
    });

    it(
      'C360532 Verify that "sourceFileId" and "naturalId" fields exist in response to search "MARC Authority" records. (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C360532'] },
      () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
        MarcAuthorities.searchBy(testData.searchOptions.keyword, marcFiles[0].authorityHeading);
        MarcAuthorities.verifyAuthorityPropertiesAfterSearch(testData.expectedProperties);
      },
    );

    it(
      'C409449 Search for "MARC authority" records using "Name-title" search option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C409449'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(
            testData.userPropertiesC409449.username,
            testData.userPropertiesC409449.password,
            {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            },
          );
          cy.reload();
          MarcAuthorities.waitLoading();
        }, 20_000);
        MarcAuthorities.searchBy(testData.searchOptions.nameTitle, searchQueriesC409449[0]);
        searchResultsDataC409449.forEach((result) => {
          MarcAuthorities.verifyResultsRowContent(result[1], result[0], result[2]);
        });
        MarcAuthorities.checkRowsCount(searchResultsDataC409449.length);
        MarcAuthorities.searchBy(testData.searchOptions.nameTitle, searchQueriesC409449[1]);
        MarcAuthorities.verifyResultsRowContent(
          searchResultsDataC409449[0][1],
          searchResultsDataC409449[0][0],
          searchResultsDataC409449[0][2],
        );
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.searchBy(testData.searchOptions.nameTitle, searchQueriesC409449[2]);
        MarcAuthorities.verifyResultsRowContent(
          searchResultsDataC409449[4][1],
          searchResultsDataC409449[4][0],
          searchResultsDataC409449[4][2],
        );
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.searchBy(testData.searchOptions.nameTitle, searchQueriesC409449[3]);
        MarcAuthorities.verifyResultsRowContent(
          searchResultsDataC409449[8][1],
          searchResultsDataC409449[8][0],
          searchResultsDataC409449[8][2],
        );
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.searchBy(testData.searchOptions.nameTitle, searchQueriesC409449[4]);
        MarcAuthorities.checkNoResultsMessage(testData.noResultsMessage);
        MarcAuthorities.searchBy(testData.searchOptions.nameTitle, searchQueriesC409449[5]);
        MarcAuthorities.checkNoResultsMessage(testData.noResultsMessage);
        MarcAuthorities.searchBy(testData.searchOptions.nameTitle, searchQueriesC409449[6]);
        MarcAuthorities.checkNoResultsMessage(testData.noResultsMessage);
      },
    );
  });
});
