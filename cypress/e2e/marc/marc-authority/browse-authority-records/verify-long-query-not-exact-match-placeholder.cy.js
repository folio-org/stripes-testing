import { Permissions } from '../../../../support/dictionary';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const testData = {
        searchOption: 'Personal name',
        // Long query that won't match any record - testing placeholder display
        longQuery: 'Instituto de Ciencias Sociales (Fundacion de Cultura Universitaria Test)',
        authorityPrefix: 'n',
        createdAuthorityIDs: [],
        // Sample authority records to provide browse context
        authorityRecords: [
          { heading: 'C360549 Anderson, Alice', tag: '100', indicators: ['1', '\\'] },
          { heading: 'C360549 Brown, Robert', tag: '100', indicators: ['1', '\\'] },
          { heading: 'C360549 Chen, Wei', tag: '100', indicators: ['1', '\\'] },
          { heading: 'C360549 Davis, John', tag: '100', indicators: ['1', '\\'] },
          { heading: 'C360549 Edwards, Mary', tag: '100', indicators: ['1', '\\'] },
          { heading: 'C360549 Johnson, Sarah', tag: '100', indicators: ['1', '\\'] },
          { heading: 'C360549 Martinez, Carlos', tag: '100', indicators: ['1', '\\'] },
          { heading: 'C360549 Wilson, James', tag: '100', indicators: ['1', '\\'] },
        ],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        testData.authorityRecords.forEach((record) => {
          const naturalId = `${testData.authorityPrefix}${getRandomLetters(10)}`;
          MarcAuthorities.createMarcAuthorityViaAPI(testData.authorityPrefix, naturalId, [
            {
              tag: record.tag,
              content: `$a ${record.heading}`,
              indicators: record.indicators,
            },
          ]).then((authorityId) => {
            testData.createdAuthorityIDs.push(authorityId);
          });
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        testData.createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        "C360549 Verify that long query doesn't cut off in the not-exact match placeholder (spitfire)",
        { tags: ['extendedPath', 'spitfire', 'C360549'] },
        () => {
          // Step 1: Click on the browse option dropdown and select any browse option
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);

          // Step 2: Fill in the search box with long not-exact match query
          MarcAuthoritiesSearch.fillSearchInput(testData.longQuery);
          MarcAuthorities.checkSearchInput(testData.longQuery);

          // Step 3: Click on the "Search" button
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorityBrowse.checkResultWithNoValue(testData.longQuery);
        },
      );
    });
  });
});
