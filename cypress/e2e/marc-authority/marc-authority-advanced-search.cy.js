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
  const testData = {};
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
    MarcAuthorities.fillAdvancedSearchField(0, 'TestPersonalName', 'Personal name');
    MarcAuthorities.fillAdvancedSearchField(1, 'TestCorporate/ConferenceName', 'Corporate/Conference name', 'OR');
    MarcAuthorities.clickSearchButton();
    MarcAuthorities.checkSearchInput('personalNameTitle==TestPersonalName or corporateNameTitle==TestCorporate/ConferenceName');
    MarcAuthorities.checkRowsContent(['TestCorporate/ConferenceName', 'TestPersonalName']);

    MarcAuthorities.clickAdvancedSearchButton();
    MarcAuthorities.fillAdvancedSearchField(2, 'TestUniformTitle', 'Uniform title', 'OR');
    MarcAuthorities.clickSearchButton();
    MarcAuthorities.checkSearchInput('personalNameTitle==TestPersonalName or corporateNameTitle==TestCorporate/ConferenceName or uniformTitle==TestUniformTitle');
    MarcAuthorities.checkRowsContent(['TestCorporate/ConferenceName', 'TestPersonalName', 'TestUniformTitle']);

    MarcAuthorities.clickAdvancedSearchButton();
    MarcAuthorities.fillAdvancedSearchField(1, '', 'Keyword', 'AND');
    MarcAuthorities.clickSearchButton();
    MarcAuthorities.checkSearchInput('personalNameTitle==TestPersonalName or uniformTitle==TestUniformTitle');
    MarcAuthorities.checkRowsContent(['TestPersonalName', 'TestUniformTitle']);
  });
});
