import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('MARC Authority management', () => {
  const testData = {};
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  let fileName;
  const createdAuthorityIDs = [];

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
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
    createdAuthorityIDs.forEach(id => {
      MarcAuthority.deleteViaAPI(id);
    });
  });

  it('C360520 Import of "MARC Authority" record with valid prefix in "001" field only (spitfire)', { tags: [TestTypes.smoke, Features.authority, DevTeams.spitfire] }, () => {
    DataImport.uploadFile('marcFileForC360520.mrc', fileName);
    JobProfiles.waitLoadingList();
    JobProfiles.searchJobProfileForImport(jobProfileToRun);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(fileName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileName);
    for (let i = 0; i < 1; i++) {
      Logs.getCreatedItemsID(i).then(link => {
        createdAuthorityIDs.push(link.split('/')[5]);
      });
    }
    Logs.goToTitleLink('Chemistry, Organic');
    Logs.checkAuthorityLogJSON(['"sourceFileId":', '"191874a0-707a-4634-928e-374ee9103225"', '"naturalId":', '"fst00853501"']);
  });

  it('C360521 Import of "MARC Authority" record with valid prefix in "010 $a" field only (spitfire)', { tags: [TestTypes.smoke, Features.authority, DevTeams.spitfire] }, () => {
    DataImport.uploadFile('corporate_name(prefix_in_010Sa)sc_02.mrc', fileName);
    JobProfiles.waitLoadingList();
    JobProfiles.searchJobProfileForImport(jobProfileToRun);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(fileName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileName);
    for (let i = 0; i < 3; i++) {
      Logs.getCreatedItemsID(i).then(link => {
        createdAuthorityIDs.push(link.split('/')[5]);
      });
    }
    Logs.goToTitleLink('Apple Academic Press');
    Logs.checkAuthorityLogJSON(['"sourceFileId":', '"af045f2f-e851-4613-984c-4bc13430454a"', '"naturalId":', '"n2015002050"']);
  });

  it('C360522 Import of "MARC Authority" record with same valid prefixes in "001" and "010 $a" fields (spitfire)', { tags: [TestTypes.smoke, Features.authority, DevTeams.spitfire] }, () => {
    DataImport.uploadFile('D_genre(prefixes_in_001_010Sa)sc_03.mrc', fileName);
    JobProfiles.waitLoadingList();
    JobProfiles.searchJobProfileForImport(jobProfileToRun);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(fileName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileName);
    for (let i = 0; i < 2; i++) {
      Logs.getCreatedItemsID(i).then(link => {
        createdAuthorityIDs.push(link.split('/')[5]);
      });
    }
    Logs.goToTitleLink('Case Reports');
    Logs.checkAuthorityLogJSON(['"sourceFileId":', '"6ddf21a6-bc2f-4cb0-ad96-473e1f82da23"', '"naturalId":', '"D002363"']);
  });
});
