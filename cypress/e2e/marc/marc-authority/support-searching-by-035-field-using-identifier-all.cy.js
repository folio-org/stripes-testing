import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';

const testData = {
  authorityIDs: [],
  searchOptions: {
    IDENTIFIERS_ALL: 'Identifier (all)',
    KEYWORD: 'Keyword',
  },

  searchQueries: {
    firstQuery: '(OCoLC)oca0031660073',
    secondQuery: '*oca0031660073',
    thirdQuery: '(OCoLC)oca00316600*',
    fourthQuery: '(OCoLC)oca0031660073',
    fifthQuery: '*oca0031660073',
    sixthQuery: '(OCoLC)oca00316600*',
  },
  authRows: {
    warsaw: 'Warsaw Council (2nd : 1962-1965 : Basilica di San Pietro in Warsawo)',
    delaware: 'Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
    jackson: 'Jackson, Peter, 1950-2022 Inspector Banks series ;',
  },
  authorizedTypes: {
    AUTHORIZED: 'Authorized',
  },
  marcFiles: [
    {
      marc: 'marcAuthC380591_01.mrc',
      fileName: `testMarcFileAuthC380591_01.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuthC380591_02.mrc',
      fileName: `testMarcFileAuthC380591_02.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuthC380591_03.mrc',
      fileName: `testMarcFileAuthC380591_03.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numberOfRecords: 1,
    },
  ],
};
describe('MARC', () => {
  describe('MARC Authority', () => {
    before('Create test data', () => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          Object.values(testData.authRows).forEach((query) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
            }).then((authorities) => {
              if (authorities) {
                authorities.forEach(({ id }) => {
                  MarcAuthority.deleteViaAPI(id);
                });
              }
            });
          });
        },
      );
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading })
        .then(() => {
          testData.marcFiles.forEach((marcFile) => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numberOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                testData.authorityIDs.push(link.split('/')[5]);
              });
            }
            cy.visit(TopMenu.dataImportPath);
          });
        })
        .then(() => {
          cy.logout();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      Users.deleteViaApi(testData.user.userId);
      testData.authorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C380591 Search MARC: support searching by 035 $a value using "Identifier (all)" option (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        MarcAuthorities.checkSearchOptions();
        MarcAuthorities.searchBy(
          testData.searchOptions.IDENTIFIERS_ALL,
          testData.searchQueries.firstQuery,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.warsaw,
        );
        MarcAuthorities.selectFirstRecord();
        MarcAuthorities.checkFieldAndContentExistence('035', testData.searchQueries.firstQuery);

        MarcAuthorities.searchBy(
          testData.searchOptions.IDENTIFIERS_ALL,
          testData.searchQueries.secondQuery,
        );
        MarcAuthorities.checkRowsCount(2);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.delaware,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.warsaw,
        );

        MarcAuthorities.searchBy(
          testData.searchOptions.IDENTIFIERS_ALL,
          testData.searchQueries.thirdQuery,
        );
        MarcAuthorities.checkRowsCount(2);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.warsaw,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.jackson,
        );

        MarcAuthorities.searchBy(
          testData.searchOptions.KEYWORD,
          testData.searchQueries.fourthQuery,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.warsaw,
        );

        MarcAuthorities.searchBy(testData.searchOptions.KEYWORD, testData.searchQueries.fifthQuery);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.delaware,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.warsaw,
        );

        MarcAuthorities.searchBy(testData.searchOptions.KEYWORD, testData.searchQueries.sixthQuery);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.warsaw,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.jackson,
        );
      },
    );
  });
});
