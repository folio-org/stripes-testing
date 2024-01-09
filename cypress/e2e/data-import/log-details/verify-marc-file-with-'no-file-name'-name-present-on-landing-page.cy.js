import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import -> Log details', () => {
  const testData = {
    marcFileName: 'No file name.mrc',
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  before('Create test data', () => {
    cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });
  });

  beforeEach('Login with User', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C375149 Verify that .mrc files with "No file name" name are present on data import landing page (folijet) (TaaS)',
    { tags: ['extendedPath', 'folijet'] },
    () => {
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(testData.marcFileName, testData.marcFileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(testData.jobProfileToRun);
      JobProfiles.runImportFile();
      Logs.verifyFirstFileNameInLogList(testData.marcFileName);
      Logs.checkStatusOfJobProfile();
    },
  );
});
