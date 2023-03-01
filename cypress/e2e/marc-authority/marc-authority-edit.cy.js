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
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';

describe('MARC Authority -> Edit Authority record', () => {
  const testData = {
    authority: {
      title: 'Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
      searchOption: 'Keyword',
    }
  };
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
  let createdAuthorityID;

  before('', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.uploadFile('marcFileForC350901.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      Logs.getCreatedItemsID().then(link => {
        createdAuthorityID = link.split('/')[5];
      });
    });
  });

  beforeEach('', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.marcAuthorities, waiter: MarcAuthorities.waitLoading });
  });

  after('', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();

    if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it('C350901 Add multiple / delete 1XX tag of "MARC Authority" record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.selectFirst(testData.authority.title);
    MarcAuthority.edit();
    MarcAuthority.checkRemoved1XXTag(14)
    MarcAuthority.checkAddNew1XXTag(14, '100', '$a')
    QuickMarcEditor.closeWithoutSavingAfterChange();
    MarcAuthority.contains(testData.authority.title);
  });
});
