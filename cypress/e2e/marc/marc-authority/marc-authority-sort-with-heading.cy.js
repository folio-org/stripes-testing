import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC -> MARC Authority', () => {
  const testData = {
    authority: {
      title: 'Type of heading test',
      searchOption: 'Keyword',
      all: '*',
    },

    columnHeaders: [
      { header: 'Authorized/Reference', index: 1 },
      { header: 'Heading/Reference', index: 2 },
      { header: 'Type of heading', index: 3 },
    ],
  };
  const marcFiles = [
    {
      marc: 'marcFileForC353607.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 19,
    },
  ];

  const createdAuthorityIDs = [];

  before(() => {
    cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
      (createdUserProperties) => {
        testData.userProperties = createdUserProperties;
      },
    );

    marcFiles.forEach((marcFile) => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        for (let i = 0; i < marcFile.numOfRecords; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            createdAuthorityIDs.push(link.split('/')[5]);
          });
        }

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
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
    'C353607 The search result list is sorted by clicking on the titles of columns (TaaS) (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      MarcAuthorities.checkSearchOptions();
      MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.all);

      MarcAuthorities.clickActionsButton();
      MarcAuthorities.verifyActionsSortedBy('Relevance');
      testData.columnHeaders.forEach(({ header, index }) => {
        MarcAuthorities.clickOnColumnHeader(header);
        // wait for result list to be sorted
        cy.wait(2000);
        MarcAuthorities.checkResultListSortedByColumn(index);
        MarcAuthorities.clickOnColumnHeader(header);
        // wait for result list to be sorted
        cy.wait(2000);
        MarcAuthorities.checkResultListSortedByColumn(index, false);
        MarcAuthorities.verifyActionsSortedBy(header);
      });
    },
  );
});
