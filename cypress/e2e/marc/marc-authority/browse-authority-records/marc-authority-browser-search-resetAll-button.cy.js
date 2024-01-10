import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthoritiesBrowseSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesBrowseSearch';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('marc', () => {
  describe('MARC Authority', () => {
    const testData = {
      marcValue: 'C422027',
      searchOption: 'Personal name',
    };

    const marcFiles = [
      {
        marc: 'marcAuthC422027.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
      },
    ];

    const createdAuthorityIDs = [];

    before('Creating user', () => {
      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              createdAuthorityIDs.push(link.split('/')[5]);
            });
          }
        });
      });
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        },
      );
      MarcAuthorities.switchToBrowse();
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C422027 Verify that clicking on "Reset all" button will return focus and cursor to the Browse box (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        MarcAuthoritiesBrowseSearch.searchBy(testData.searchOption, testData.marcValue);
        MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        MarcAuthorities.checkResetAllButtonDisabled(false);
        MarcAuthorities.clickReset();
        MarcAuthorities.verifySearchResultTabletIsAbsent(true);
        MarcAuthorities.checkDefaultBrowseOptions(testData.marcValue);
        MarcAuthorities.checkResetAllButtonDisabled();
        MarcAuthorities.checkSearchInputInFocus();
      },
    );
  });
});
