import Permissions from '../../support/dictionary/permissions';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';

describe('data-export', () => {
  describe('Authority records export', () => {
    const user = {};
    const downloadedFile = 'C_353209.csv';
    const jobProfileToRun = 'Default - Create SRS MARC Authority';
    const propertyName = 'relatedAuthorityInfo';
    const marcFile = {
      marc: 'Genre_1_record_C353209.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    };
    const searchHeading = 'C353209 Peplum films';
    let createdRecordIDs;

    before(() => {
      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        Permissions.dataExportEnableModule.gui,
      ]).then((createdUserProperties) => {
        user.userProperties = createdUserProperties;
      });
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
          (response) => {
            response.entries.forEach((record) => {
              createdRecordIDs = record[propertyName].idList[0];
            });
          },
        );
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
      MarcAuthority.deleteViaAPI(createdRecordIDs);
    });

    it(
      'C353209 Export failed when using ".csv" file with non-existent UUIDs (Spitfire) (TaaS)',
      { tags: ['extendedPathBroken', 'spitfire'] },
      () => {
        MarcAuthorities.searchBy('Keyword', searchHeading);
        MarcAuthorities.downloadSelectedRecordWithRowIdx();
        ExportFileHelper.downloadExportedMarcFile(downloadedFile);
        MarcAuthorities.selectRecordByIndex(0);
        MarcAuthoritiesDelete.clickDeleteButton();
        MarcAuthoritiesDelete.confirmDelete();
        MarcAuthoritiesDelete.checkDelete(searchHeading);
        cy.visit(TopMenu.dataExportPath);
        ExportFileHelper.uploadRecentlyDownloadedFile(downloadedFile);
        ExportFileHelper.exportWithDefaultJobProfile(downloadedFile, 'authority', 'Authorities');
        DataExportResults.verifyLastLog(downloadedFile, 'Fail');
      },
    );
  });
});
