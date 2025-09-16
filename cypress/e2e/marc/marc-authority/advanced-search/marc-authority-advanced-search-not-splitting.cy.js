import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
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
        keywordOption: 'Keyword',
        containsAllMatchOption: 'Contains all',
        containsAnyMatchOption: 'Contains any',
        exactPhraseMatchOption: 'Exact phrase',
      };

      const searchData = [
        [
          {
            query: 'Judaismsplitauto and literature',
            searchOption: testData.keywordOption,
            operator: false,
            modifier: testData.exactPhraseMatchOption,
          },
        ],
        [
          {
            query: 'Political aspects or Unitedsplitauto States History 20th century',
            searchOption: testData.keywordOption,
            operator: false,
            modifier: testData.containsAllMatchOption,
          },
        ],
        [
          {
            query: 'Liberalism or not Unitedsplitauto States History 20th century',
            searchOption: testData.keywordOption,
            operator: false,
            modifier: testData.containsAllMatchOption,
          },
        ],
        [
          {
            query: 'Judaismsplitauto and literature--Unitedsplitauto States--History--20th century',
            searchOption: testData.keywordOption,
            operator: false,
            modifier: testData.exactPhraseMatchOption,
          },
          {
            query: 'aspects or Unitedsplitauto',
            searchOption: testData.keywordOption,
            operator: 'OR',
            modifier: testData.containsAnyMatchOption,
          },
          {
            query: 'Unitedsplitauto States History',
            searchOption: testData.keywordOption,
            operator: 'AND',
            modifier: testData.containsAllMatchOption,
          },
          {
            query: 'Architecturesplitauto',
            searchOption: testData.keywordOption,
            operator: 'NOT',
            modifier: testData.containsAllMatchOption,
          },
        ],
      ];

      const searchResults = [
        ['Judaismsplitauto and literature--Unitedsplitauto States--History--20th century'],
        ['Rhetoric--Political aspects--or Unitedsplitauto States--History--20th century'],
        ['Liberalism or not--Unitedsplitauto States--History--20th century'],
        [
          'Judaismsplitauto and literature--Unitedsplitauto States--History--20th century',
          'Liberalism or not--Unitedsplitauto States--History--20th century',
          'Rhetoric--Political aspects--or Unitedsplitauto States--History--20th century',
        ],
      ];

      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFile = {
        marc: 'marcBibFileC466217.mrc',
        fileName: `testMarcFileC466217.${getRandomPostfix()}.mrc`,
        propertyName: 'authority',
      };

      const createdAuthorityIDs = [];

      before('Create test data, user', () => {
        cy.getAdminToken();
        searchData.flat().forEach((searchLine) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(searchLine.query);
        });
        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;
          },
        );

        DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
          (response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[marcFile.propertyName].id);
            });
          },
        );
      });

      before('Login', () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
        });
      });

      after(() => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C466217 Verify that search operators "OR" "AND" "NOT" are not splitting the search terms in "Advanced search" modal of "MARC authority" app (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C466217'] },
        () => {
          MarcAuthorities.clickAdvancedSearchButton();
          searchData.forEach((searchSet, index) => {
            searchSet.forEach((searchLine, lineIndex) => {
              MarcAuthorities.fillAdvancedSearchField(
                lineIndex,
                searchLine.query,
                searchLine.searchOption,
                searchLine.operator,
                searchLine.modifier,
              );
            });
            MarcAuthorities.clickSearchButton();
            MarcAuthorities.checkResultList(searchResults[index]);
            MarcAuthorities.checkRowsCount(searchResults[index].length);
            MarcAuthorities.clickAdvancedSearchButton();
            searchSet.forEach((searchLine, lineIndex) => {
              MarcAuthorities.checkAdvancedSearchModalFields(
                lineIndex,
                searchLine.query,
                searchLine.searchOption,
                searchLine.operator,
                searchLine.modifier,
              );
            });
          });
        },
      );
    });
  });
});
