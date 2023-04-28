import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC Authority - Advanced Search', () => {
  const testData = {
    titles: {
      titlePersonalName: 'TestPersonalName',
      titleCorporateName: 'TestCorporate/ConferenceName',
      titleUniform: 'TestUniformTitle',
      titleDefault: '',
    },
    searchOptions: {
      personalName: 'Personal name',
      corporateName: 'Corporate/Conference name',
      uniformTitle: 'Uniform title',
      keyword: 'Keyword',
    },
    booleanOptions: {
      or: 'OR',
      and: 'AND',
    },
  };
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFile = {
    marc: 'MarcAuthorities(Personal,Uniform,Corporate).mrc', fileName: `testMarcFile.${getRandomPostfix()}.mrc`
  }

  let createdAuthorityID = [];

  before(() => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.uploadFile(marcFile.marc, marcFile.fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFile.fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(marcFile.fileName);
      for (let i = 0; i < 3; i++) {
        Logs.getCreatedItemsID(i).then(link => {
          createdAuthorityID.push(link.split('/')[5]);
        });
      };
    });
  });

  beforeEach(() => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.marcAuthorities, waiter: MarcAuthorities.waitLoading });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();

    createdAuthorityID.forEach(id => { MarcAuthority.deleteViaAPI(id); });
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it('C350684 Updating Advanced Search query from modal window (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.clickActionsButton();
    MarcAuthorities.actionsSortBy('Type of heading');

    MarcAuthorities.clickAdvancedSearchButton();
    MarcAuthorities.fillAdvancedSearchField(0, testData.titles.titlePersonalName, testData.searchOptions.personalName);
    MarcAuthorities.fillAdvancedSearchField(1, testData.titles.titleCorporateName, testData.searchOptions.corporateName, testData.booleanOptions.or);
    MarcAuthorities.clickSearchButton();
    MarcAuthorities.checkSearchInput(`personalNameTitle==${testData.titles.titlePersonalName} or corporateNameTitle==${testData.titles.titleCorporateName}`);
    MarcAuthorities.checkRowsContent([testData.titles.titleCorporateName, testData.titles.titlePersonalName]);

    MarcAuthorities.clickAdvancedSearchButton();
    MarcAuthorities.fillAdvancedSearchField(2, testData.titles.titleUniform, testData.searchOptions.uniformTitle, testData.booleanOptions.or);
    MarcAuthorities.clickSearchButton();
    MarcAuthorities.checkSearchInput(`personalNameTitle==${testData.titles.titlePersonalName} or corporateNameTitle==${testData.titles.titleCorporateName} or uniformTitle==${testData.titles.titleUniform}`);
    MarcAuthorities.checkRowsContent([testData.titles.titleCorporateName, testData.titles.titlePersonalName, testData.titles.titleUniform]);

    MarcAuthorities.clickAdvancedSearchButton();
    MarcAuthorities.fillAdvancedSearchField(1, testData.titles.titleDefault, testData.searchOptions.keyword, testData.booleanOptions.and);
    MarcAuthorities.clickSearchButton();
    MarcAuthorities.checkSearchInput(`personalNameTitle==${testData.titles.titlePersonalName} or uniformTitle==${testData.titles.titleUniform}`);
    MarcAuthorities.checkRowsContent([testData.titles.titlePersonalName, testData.titles.titleUniform]);
  });
});
