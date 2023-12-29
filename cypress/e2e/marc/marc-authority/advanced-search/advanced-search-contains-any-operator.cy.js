import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC -> MARC Authority -> Advanced search', () => {
  const testData = {
    searchQueries: {
      keywords: ['AdvSearch', 'XML'],
      corporateName: 'Ekonomi Merkezi EPAM',
      conferenceName: 'Conference & Exhibition on Biomass',
      uniform: 'Chemistry American',
      default: '',
    },
    searchOptions: {
      corporateName: 'Corporate/Conference name',
      uniformTitle: 'Uniform title',
      keyword: 'Keyword',
    },
    booleanOptions: {
      or: 'OR',
      and: 'AND',
      not: 'NOT',
    },
    matchOptions: {
      containsAny: 'Contains any',
    },
  };

  const records = [
    'Conference & Exhibition on Biomass for Energy (2004 : Jönköping, Sweden) AdvSearch data',
    'EPAM Ltda. AdvSearch data',
    'American Chemical Society. Industrial and Engineering Chemistry Division AdvSearch data XML',
    'Ekonomi Merkezi AdvSearch data',
    'Exhibition on Biomass for Energy (2004 : Jönköping, Sweden) AdvSearch data',
    'American Chemical Society. Division of Industrial and Engineering Chemistry AdvSearch data',
    'EPAM AdvSearch data XML',
    'İstanbul Üniversitesi. Ekonomi Politikaları Uygulama ve Araştırma Merkezi',
    'XML Conference & Exhibition',
    'Conference, AdvSearch data',
    'ACS Division of Industrial and Engineering Chemistry XML AdvSearch data',
    'EkonomiMerkeziEPAM',
  ];

  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFile = {
    marc: 'MarcAuthoritiesForC407726.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
  };

  const createdAuthorityID = [];

  before(() => {
    cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
      (createdUserProperties) => {
        testData.userProperties = createdUserProperties;
      },
    );

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFile.fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(marcFile.fileName);
      for (let i = 0; i < 5; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          createdAuthorityID.push(link.split('/')[5]);
        });
      }
    });
  });

  beforeEach(() => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.marcAuthorities,
      waiter: MarcAuthorities.waitLoading,
    });
  });

  after(() => {
    cy.getAdminToken();
    createdAuthorityID.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C407726 Advanced search of "MARC authority" records using "Contains any" search operator (Corporate/Conference name and Uniform title) (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      // #1 Click on the "Advanced search" button placed on the "Search & filter" pane.
      MarcAuthorities.clickAdvancedSearchButton();

      // #2 - #4 Fill in the first row: "Ekonomi Merkezi EPAM", "Contains any" operator, "Corporate/Conference name" option
      MarcAuthorities.fillAdvancedSearchField(
        0,
        testData.searchQueries.corporateName,
        testData.searchOptions.corporateName,
        false,
        testData.matchOptions.containsAny,
      );
      // #5 Click on the "Search" button
      MarcAuthorities.clickSearchButton();
      [3, 7, 6, 1, 11]
        .map((index) => records[index])
        .forEach((record) => {
          MarcAuthorities.checkRow(record);
        });
      MarcAuthorities.checkRowsCount(5);

      // #6 Click on the "Advanced search" button placed on the "Search & filter" pane.
      MarcAuthorities.clickAdvancedSearchButton();

      // #7 - #10 Fill the second row in following way: "OR "Conference & Exhibition on Biomass" Contains any in "Corporate/Conference name"
      MarcAuthorities.fillAdvancedSearchField(
        1,
        testData.searchQueries.conferenceName,
        testData.searchOptions.corporateName,
        testData.booleanOptions.or,
        testData.matchOptions.containsAny,
      );

      // #11 Click on the "Search" button
      MarcAuthorities.clickSearchButton();
      [0, 1, 3, 4, 6, 7, 8, 9, 11]
        .map((index) => records[index])
        .forEach((record) => {
          MarcAuthorities.checkRow(record);
        });
      MarcAuthorities.checkRowsCount(9);

      // #12 Click on the "Advanced search" button placed on the "Search & filter" pane.
      MarcAuthorities.clickAdvancedSearchButton();

      // #13 - #16 Fill the third row: "OR "Chemistry American" Contains any in "Uniform title"
      MarcAuthorities.fillAdvancedSearchField(
        2,
        testData.searchQueries.uniform,
        testData.searchOptions.uniformTitle,
        testData.booleanOptions.or,
        testData.matchOptions.containsAny,
      );

      // #17 Click on the "Search" button
      MarcAuthorities.clickSearchButton();
      records.forEach((record) => {
        MarcAuthorities.checkRow(record);
      });
      MarcAuthorities.checkRowsCount(12);
      // #18 Click on the "Advanced search" button placed on the "Search & filter" pane.
      MarcAuthorities.clickAdvancedSearchButton();

      // #19 - #20 Fill the fourth row: "AND" "AdvSearch" Contains any in "Keyword"
      MarcAuthorities.fillAdvancedSearchField(
        3,
        testData.searchQueries.keywords[0],
        testData.searchOptions.keyword,
        testData.booleanOptions.and,
        testData.matchOptions.containsAny,
      );

      // #21 Click on the "Search" button
      MarcAuthorities.clickSearchButton();
      [0, 3, 1, 4, 6, 9, 7, 8, 11]
        .map((index) => records[index])
        .forEach((record) => {
          MarcAuthorities.checkRow(record);
        });
      MarcAuthorities.checkRowsCount(9);

      // #22 Click on the "Advanced search" button placed on the "Search & filter" pane.
      MarcAuthorities.clickAdvancedSearchButton();

      // #23 - #25 Fill the fifth row: "NOT "XML" Contains any in "Keyword"
      MarcAuthorities.fillAdvancedSearchField(
        4,
        testData.searchQueries.keywords[1],
        testData.searchOptions.keyword,
        testData.booleanOptions.not,
        testData.matchOptions.containsAny,
      );
      // #26 Click on the "Search" button.
      MarcAuthorities.clickSearchButton();
      [0, 3, 1, 4, 9, 10]
        .map((index) => records[index])
        .forEach((record) => {
          MarcAuthorities.checkRow(record);
        });
      MarcAuthorities.checkRowsCount(6);
    },
  );
});
