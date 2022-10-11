import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('MARC Authority management', () => {
  const testData = {};
  const pathToFile = 'corporate_name(prefix_in_010Sa)sc_02.mrc';
  const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
  const jobProfileToRun = 'Default - Create SRS MARC Authority';

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;

      cy.login(createdUserProperties.username, createdUserProperties.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    });
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  it('C360521 Import of "MARC Authority" record with valid prefix in "010 $a" field only (spitfire)', { tags: [TestTypes.smoke, Features.authority, DevTeams.spitfire] }, () => {
    DataImport.uploadFile(pathToFile, fileName)
    JobProfiles.waitLoadingList();
    JobProfiles.searchJobProfileForImport(jobProfileToRun);
    JobProfiles.runImportFile(fileName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileName);
    Logs.goToTitleLink('Apple Academic Press');
    Logs.checkAuthorityLogJSON();
  });
});
