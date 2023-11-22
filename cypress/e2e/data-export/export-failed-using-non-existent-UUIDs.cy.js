import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import getRandomPostfix from '../../support/utils/stringTools';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import Permissions from '../../support/dictionary/permissions';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import FileManager from '../../support/utils/fileManager';
import MarcAuthoritiesDelete from '../../support/fragments/marcAuthority/marcAuthoritiesDelete';

describe('data-export: failed using non-existent UUIDs', () => {
  const user = {};
  const downloadedFile = 'C_353209.csv';
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFile = {
    marc: 'Genre_1_record_C353209.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
  };
  before(() => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      Permissions.dataExportEnableModule.gui,
    ]).then((createdUserProperties) => {
      user.userProperties = createdUserProperties;
    });
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFile.fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(marcFile.fileName);
      cy.login(user.userProperties.username, user.userProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after(() => {
    FileManager.deleteFileFromDownloadsByMask('*.csv');
    FileManager.deleteFile(`cypress/fixtures/${downloadedFile}`);
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(user.userProperties.userId);
    });
  });

  it(
    'C353209 Export failed when using ".csv" file with non-existent UUIDs (Spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, devTeams.spitfire] },
    () => {
      MarcAuthorities.searchBy('Keyword', 'Peplum films');
      MarcAuthorities.downloadSelectedRecordWithRowIdx();
      MarcAuthoritiesDelete.clickDeleteButton();
      MarcAuthoritiesDelete.confirmDelete();
      cy.visit(TopMenu.dataExportPath);
      ExportFileHelper.uploadRecentlyDownloadedFile(downloadedFile);
      ExportFileHelper.exportWithDefaultJobProfile(downloadedFile, 'authority', 'Authorities');
      DataExportResults.verifyLastLog(downloadedFile, 'Fail');
    },
  );
});
