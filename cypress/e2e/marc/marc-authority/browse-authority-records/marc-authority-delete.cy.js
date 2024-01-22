import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC -> MARC Authority -> Browse - Authority records', () => {
  const testData = {
    uniqueFileName: `C350643autotestFile.${getRandomPostfix()}.mrc`,
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    fileName2: `testMarcFile2.${getRandomPostfix()}.mrc`,
    record: 'Angelou, Maya. And still I rise C357549',
    searchOption: 'Name-title',
  };

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.settingsDataImportView.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    });
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C350643 Delete a "MARC Authority" record via "MARC Authority" app (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      DataImport.uploadFile('marcFileForC357549.mrc', testData.fileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.waitLoadingList();
      JobProfiles.search('Default - Create SRS MARC Authority');
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(testData.fileName);
      Logs.checkJobStatus(testData.fileName, 'Completed');

      cy.visit(TopMenu.marcAuthorities);
      MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.record);
      MarcAuthorities.selectItem(testData.record);
      MarcAuthority.waitLoading();

      MarcAuthoritiesDelete.clickDeleteButton();
      MarcAuthoritiesDelete.checkDeleteModal();
      MarcAuthoritiesDelete.confirmDelete();
      MarcAuthoritiesDelete.checkDelete(testData.record);
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.record);
      MarcAuthoritiesDelete.checkEmptySearchResults(testData.record);
    },
  );

  it(
    'C357549 Delete a "MARC Authority" record (from browse result list) (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      DataImport.uploadFile('marcFileForC357549.mrc', testData.fileName2);
      JobProfiles.waitFileIsUploaded();
      DataImport.importFileForBrowse(MarcAuthority.defaultCreateJobProfile, testData.fileName2);
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.switchToBrowse();
      MarcAuthorityBrowse.searchBy(testData.searchOption, testData.record);
      MarcAuthorities.selectItem(testData.record);
      MarcAuthority.waitLoading();
      MarcAuthoritiesDelete.clickDeleteButton();
      MarcAuthoritiesDelete.checkDeleteModal();
      MarcAuthoritiesDelete.confirmDelete();
      MarcAuthoritiesDelete.checkAfterDeletion(testData.record);
    },
  );
});
