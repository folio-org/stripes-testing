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

describe('Importing MARC Authority files', () => {
  const testData = {};
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  let fileName;
  let createdAuthorityID;

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });
  });

  beforeEach('Login to the application', () => {
    fileName = `testMarcFile.${getRandomPostfix()}.mrc`;

    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
  });

  afterEach('Deleting data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    MarcAuthority.deleteViaAPI(createdAuthorityID);
  });

  it('C350666 Create a MARC authority record via data import (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    DataImport.uploadFile('test-auth-file.mrc', fileName);
    JobProfiles.waitLoadingList();
    JobProfiles.searchJobProfileForImport(jobProfileToRun);
    JobProfiles.runImportFile(fileName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileName);
    Logs.getCreatedItemsID().then(link => {
      createdAuthorityID = link.split('/')[5];
    });
    Logs.goToTitleLink('Created');
    MarcAuthority.contains('MARC');
  });
});
