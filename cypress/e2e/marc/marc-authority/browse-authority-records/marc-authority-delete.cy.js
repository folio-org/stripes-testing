import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../support/constants';
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
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const testData = {
        uniqueFileName: `C350643autotestFile.${getRandomPostfix()}.mrc`,
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        fileName2: `testMarcFile2.${getRandomPostfix()}.mrc`,
        recordForC357549: 'C357549 Angelou, Maya. And still I rise',
        recordForC350643: 'C350643 Angelou, Maya. And still I rise',
        searchOption: 'Name-title',
      };

      before('Creating data', () => {
        cy.getAdminToken();
        ['C350643', 'C357549'].forEach((record) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(record);
        });
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
        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
        }, 20_000);
      });

      after('Deleting created user', () => {
        if (testData?.userProperties?.userId) {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
        }
      });

      it(
        'C357549 Delete a "MARC Authority" record (from browse result list) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C357549'] },
        () => {
          DataImport.uploadFile('marcFileForC357549.mrc', testData.fileName2);
          JobProfiles.waitFileIsUploaded();
          DataImport.importFileForBrowse(
            DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            testData.fileName2,
          );
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(testData.searchOption, testData.recordForC357549);
          MarcAuthorities.selectItem(testData.recordForC357549);
          MarcAuthority.waitLoading();
          MarcAuthoritiesDelete.clickDeleteButton();
          MarcAuthoritiesDelete.checkDeleteModal();
          MarcAuthoritiesDelete.confirmDelete();
          MarcAuthoritiesDelete.checkAfterDeletion(testData.recordForC357549);
        },
      );

      it(
        'C350643 Delete a "MARC Authority" record via "MARC Authority" app (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'shiftLeft', 'C350643'] },
        () => {
          DataImport.uploadFile('marcFileForC350643.mrc', testData.fileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.waitLoadingList();
          JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(testData.fileName);
          Logs.checkJobStatus(testData.fileName, 'Completed');

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.recordForC350643);
          MarcAuthorities.selectItem(testData.recordForC350643);
          MarcAuthority.waitLoading();

          MarcAuthoritiesDelete.clickDeleteButton();
          MarcAuthoritiesDelete.checkDeleteModal();
          MarcAuthoritiesDelete.confirmDelete();
          MarcAuthoritiesDelete.checkDelete(testData.recordForC350643);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.recordForC350643);
          MarcAuthoritiesDelete.checkEmptySearchResults(testData.recordForC350643);
        },
      );
    });
  });
});
