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
    personalNameOption: 'Personal name',
    nameTitleOption: 'Name-title',
    personalNameType: 'Personal Name',
    keywordOption: 'Keyword',
    containsAllMatchOption: 'Contains all',
  };

  const searchData = [
    {
      query: 'Jack, Adrienne',
      searchOption: testData.personalNameOption,
      operator: false,
    },
    {
      query: 'Adrian, George',
      searchOption: testData.personalNameOption,
      operator: 'OR',
    },
    {
      query: 'Steig, William',
      searchOption: testData.nameTitleOption,
      operator: 'OR',
    },

    {
      query: 'Third',
      searchOption: testData.keywordOption,
      operator: false,
    },
    {
      query: 'Shrek',
      searchOption: testData.nameTitleOption,
      operator: 'NOT',
    },
  ];

  const searchResults = [
    [
      {
        type: 'Reference',
        heading: 'Jack, Michael Adrienne',
      },
      {
        type: 'Authorized',
        heading: 'Jack, Adrienne',
      },
      {
        type: 'Authorized',
        heading: 'Adrienne, Jack, M.',
      },
      {
        type: 'Auth/Ref',
        heading: 'Amanda, Adrienne, Michaela, Jack, Third',
      },
    ],
    [
      {
        type: 'Reference',
        heading: 'Jack, Michael Adrienne',
      },
      {
        type: 'Authorized',
        heading: 'Jack, Adrienne',
      },
      {
        type: 'Authorized',
        heading: 'Adrian, George',
      },
      {
        type: 'Authorized',
        heading: 'Adrienne, Jack, M.',
      },
      {
        type: 'Auth/Ref',
        heading: 'George, W., Adrian',
      },
      {
        type: 'Auth/Ref',
        heading: 'Amanda, Adrienne, Michaela, Jack, Third',
      },
      {
        type: 'Auth/Ref',
        heading: 'Adrian, The Third - George W.',
      },
    ],
    [
      {
        type: 'Reference',
        heading: 'Jack, Michael Adrienne',
      },
      {
        type: 'Authorized',
        heading: 'Jack, Adrienne',
      },
      {
        type: 'Authorized',
        heading: 'Adrian, George',
      },
      {
        type: 'Authorized',
        heading: 'Adrienne, Jack, M.',
      },
      {
        type: 'Auth/Ref',
        heading: 'George, W., Adrian',
      },
      {
        type: 'Auth/Ref',
        heading: 'Amanda, Adrienne, Michaela, Jack, Third',
      },
      {
        type: 'Auth/Ref',
        heading: 'Adrian, The Third - George W.',
      },
      {
        type: 'Reference',
        heading: 'William, W. Steig, Shrek: "The third"',
      },
      {
        type: 'Authorized',
        heading: 'Steig, William, 1907-2003. Shrek!',
      },
      {
        type: 'Authorized',
        heading: 'S.William, 1907-2003. Gorky rises (Steig), . Chinese',
      },
      {
        type: 'Auth/Ref',
        heading: 'Geji fei tian ji 1907-2003. Steig, (third) William',
      },
    ],
    [
      {
        type: 'Auth/Ref',
        heading: 'Amanda, Adrienne, Michaela, Jack, Third',
      },
      {
        type: 'Auth/Ref',
        heading: 'Adrian, The Third - George W.',
      },
      {
        type: 'Reference',
        heading: 'William, W. Steig, Shrek: "The third"',
      },
      {
        type: 'Auth/Ref',
        heading: 'Geji fei tian ji 1907-2003. Steig, (third) William',
      },
    ],
    [
      {
        type: 'Auth/Ref',
        heading: 'Amanda, Adrienne, Michaela, Jack, Third',
      },
      {
        type: 'Auth/Ref',
        heading: 'Adrian, The Third - George W.',
      },
      {
        type: 'Auth/Ref',
        heading: 'Geji fei tian ji 1907-2003. Steig, (third) William',
      },
    ],
  ];

  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFile = {
    marc: 'marcAuthFileC407722.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    numOfRecords: 8,
  };

  const createdAuthorityIDs = [];

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
      for (let i = 0; i < marcFile.numOfRecords; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          createdAuthorityIDs.push(link.split('/')[5]);
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
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C407722 Advanced search of "MARC authority" records using "Contains all" search operator (Personal name and Name-title) (spitfire)',
    { tags: ['criticalPath', 'spitfire', 'nonParallel'] },
    () => {
      searchData.forEach((search, index) => {
        MarcAuthorities.clickAdvancedSearchButton();
        if (!index) {
          MarcAuthorities.checkAdvancedSearchModalFields(
            index,
            '',
            testData.keywordOption,
            search.operator,
            testData.containsAllMatchOption,
          );
        }
        MarcAuthorities.fillAdvancedSearchField(
          index,
          search.query,
          search.searchOption,
          search.operator,
        );
        MarcAuthorities.checkAdvancedSearchModalFields(
          index,
          search.query,
          search.searchOption,
          search.operator,
          testData.containsAllMatchOption,
        );
        MarcAuthorities.clickSearchButton();
        searchResults[index].forEach((result) => {
          MarcAuthorities.verifyResultsRowContent(
            result.heading,
            result.type,
            testData.personalNameType,
          );
        });
      });
    },
  );
});
