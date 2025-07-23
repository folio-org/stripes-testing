import Permissions from '../../../support/dictionary/permissions';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Data Export', () => {
  describe('Authority records export', () => {
    const user = {};
    const downloadedFile = 'C_353209.csv';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
    const marcFile = {
      marc: 'Genre_1_record_C353209.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    };
    const searchHeading = 'C353209 Peplum films';

    before(() => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun);

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((createdUserProperties) => {
        user.userProperties = createdUserProperties;

        cy.login(user.userProperties.username, user.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      FileManager.deleteFileFromDownloadsByMask('*.csv');
      FileManager.deleteFile(`cypress/fixtures/${downloadedFile}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userProperties.userId);
      });
    });

    it(
      'C353209 Export failed when using ".csv" file with non-existent UUIDs (Spitfire) (TaaS)',
      { tags: ['extendedPathBroken', 'spitfire', 'C353209'] },
      () => {
        MarcAuthorities.searchBy('Keyword', searchHeading);
        MarcAuthorities.downloadSelectedRecordWithRowIdx();
        ExportFileHelper.downloadExportedMarcFile(downloadedFile);
        MarcAuthorities.selectRecordByIndex(0);
        MarcAuthoritiesDelete.clickDeleteButton();
        MarcAuthoritiesDelete.confirmDelete();
        MarcAuthoritiesDelete.checkDelete(searchHeading);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFileHelper.uploadRecentlyDownloadedFile(downloadedFile);
        ExportFileHelper.exportWithDefaultJobProfile(
          downloadedFile,
          'Default authority',
          'Authorities',
        );
        DataExportResults.verifyLastLog(downloadedFile, 'Fail');
      },
    );
  });
});
