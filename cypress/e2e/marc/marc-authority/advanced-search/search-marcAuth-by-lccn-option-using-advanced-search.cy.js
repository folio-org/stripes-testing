import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      const testData = {
        marcFile: {
          marc: 'marcAuthFileForC451456.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        searchOptionLCCN: 'LCCN',
        AUTHORIZED: 'Authorized',
      };

      const searchDataFirstRow = {
        row: 0,
        query: 'sh85057895',
        matchOption: 'Exact phrase',
        operator: false,
      };

      const searchData = [
        {
          row: 1,
          query: '  SH  85057895  ',
          matchOption: 'Exact phrase',
          operator: 'AND',
        },
        {
          row: 2,
          query: '85057895',
          matchOption: 'Contains all',
          operator: 'AND',
        },
        {
          row: 3,
          query: 'SH7663',
          matchOption: 'Starts with',
          operator: 'OR',
        },
        {
          row: 4,
          query: '76638',
          matchOption: 'Contains all',
          operator: 'OR',
        },
        {
          row: 5,
          query: '766384',
          matchOption: 'Exact phrase',
          operator: 'OR',
        },
      ];

      const searchResults = [
        'C451456 Test LCCN subfield a record 1 (two leading spaces, one trailing space, two internal spaces)',
        'C451456 Test LCCN subfield a record 2 (one space internal)',
        'C451456 Test LCCN subfield a record 3 (two spaces internal)',
        'C451456 Test LCCN subfield a record 4 (one space trailing)',
        'C451456 Test LCCN subfield a record 5 (two spaces trailing)',
        'C451456 Test LCCN subfield a record 6 (one space leading)',
        'C451456 Test LCCN subfield a record 7 (two spaces leading)',
        'C451456 Test LCCN subfield a record 8 (two spaces everywhere)',
        'C451456 Test LCCN subfield a record 9 (no spaces)',
        'C451456 Test LCCN subfield z record 1 (two leading spaces, one trailing space, two internal spaces)',
        'C451456 Test LCCN subfield z record 2 (one space internal)',
        'C451456 Test LCCN subfield z record 3 (two spaces internal)',
        'C451456 Test LCCN subfield z record 4 (one space trailing)',
        'C451456 Test LCCN subfield z record 5 (two spaces trailing)',
        'C451456 Test LCCN subfield z record 6 (one space leading)',
        'C451456 Test LCCN subfield z record 7 (two spaces leading)',
        'C451456 Test LCCN subfield z record 8 (two spaces everywhere)',
        'C451456 Test LCCN subfield z record 9 (no spaces)',
      ];

      const createdAuthorityIDs = [];

      before(() => {
        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            DataImport.uploadFileViaApi(
              testData.marcFile.marc,
              testData.marcFile.fileName,
              testData.marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record.authority.id);
              });
            });

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
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
        'C451456 Search for "MARC authority" by "LCCN" option when using "Advanced search" ($a and $z) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C451456'] },
        () => {
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.fillAdvancedSearchField(
            searchDataFirstRow.row,
            searchDataFirstRow.query,
            testData.searchOptionLCCN,
            false,
            searchDataFirstRow.matchOption,
          );
          searchData.forEach((data) => {
            MarcAuthorities.fillAdvancedSearchField(
              data.row,
              data.query,
              testData.searchOptionLCCN,
              data.operator,
              data.matchOption,
            );
          });

          MarcAuthorities.checkAdvancedSearchModalFields(
            searchDataFirstRow.row,
            searchDataFirstRow.query,
            testData.searchOptionLCCN,
            false,
            searchDataFirstRow.matchOption,
          );
          searchData.forEach((data) => {
            MarcAuthorities.checkAdvancedSearchModalFields(
              data.row,
              data.query,
              testData.searchOptionLCCN,
              data.operator,
              data.matchOption,
            );
          });

          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          searchResults.forEach((result) => {
            MarcAuthorities.checkAfterSearch(testData.AUTHORIZED, result);
          });
        },
      );
    });
  });
});
