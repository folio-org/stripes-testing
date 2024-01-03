import getRandomPostfix from '../../../../support/utils/stringTools';
import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      const testData = {
        marcFile: {
          marc: 'C358937MarcAuth.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
        },
        numbers: {
          firstValue: 'sj  2018050004',
          secondValue: 'sj  2021053664',
        },
        searchOption: 'Identifier (all)',
        booleanOption: 'OR',
        matchOption: 'Exact phrase',
      };
      const createdAuthorityIDs = [];

      before(() => {
        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;
            cy.loginAsAdmin({
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
            DataImport.uploadFileAndRetry(testData.marcFile.marc, testData.marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(testData.marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(testData.marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(testData.marcFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              createdAuthorityIDs.push(link.split('/')[5]);
            });
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C350617 Advanced search MARC: support search for "naturalId" field using "Keyword" search option (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          // Step 1: Click on the "Advanced search" button at the "Search & filter" pane.
          MarcAuthorities.clickAdvancedSearchButton();

          // Steps 2 - 5 Filling fields with relevant info.
          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.numbers.firstValue,
            testData.searchOption,
            false,
            testData.matchOption,
          );
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.numbers.secondValue,
            testData.searchOption,
            testData.booleanOption,
            testData.matchOption,
          );

          // Step 3: Click on "Search" button.
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.checkResultList([
            'María de Jesús, de Agreda, sister, 1602-1665',
            'Montessori method of education',
          ]);

          // Step 6 Click on the "Advanced search" button again.
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            testData.numbers.firstValue,
            testData.searchOption,
            false,
            testData.matchOption,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            1,
            testData.numbers.secondValue,
            testData.searchOption,
            testData.booleanOption,
            testData.matchOption,
          );
        },
      );
    });
  });
});
