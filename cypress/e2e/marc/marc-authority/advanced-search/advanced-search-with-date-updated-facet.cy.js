import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Advanced Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(13);
      const randomDigits = `350690${randomNDigitNumber(6)}`;

      // Use UTC dates: the Date updated filter and the "Last updated" display both use UTC on test envs
      const today = new Date(Date.now());
      const todayText = today.toISOString().split('T')[0]; // YYYY-MM-DD for the filter fields
      const todayDisplayText = `${today.getUTCMonth() + 1}/${today.getUTCDate()}/${today.getUTCFullYear()}`; // M/D/YYYY for the detail pane

      const testData = {
        headings: [
          `AT_C350690_MarcAuthority_PersonalName_${randomPostfix}`,
          `AT_C350690_MarcAuthority_CorporateName_${randomPostfix}`,
        ],
      };

      const authorityIds = [];
      let user;

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C350690_');

        MarcAuthorities.createMarcAuthorityViaAPI(randomLetters, `${randomDigits}1`, [
          {
            tag: '100',
            content: `$a ${testData.headings[0]}`,
            indicators: ['1', '\\'],
          },
        ]).then((id) => {
          authorityIds[0] = id;
        });

        MarcAuthorities.createMarcAuthorityViaAPI(randomLetters, `${randomDigits}2`, [
          {
            tag: '110',
            content: `$a ${testData.headings[1]}`,
            indicators: ['2', '\\'],
          },
        ]).then((id) => {
          authorityIds[1] = id;
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProps) => {
            user = userProps;
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(user.userId);
        authorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
      });

      it(
        'C350690 Advanced search of MARC authority records with Date update facet (promin)',
        { tags: ['extendedPath', 'promin', 'C350690'] },
        () => {
          // Steps 1-3: open Advanced search, fill row 1 (Keyword) and row 2 (OR Corporate/Conference name)
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.headings[0],
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          );
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.headings[1],
            MARC_AUTHORITY_SEARCH_OPTIONS.CORPORATE_CONFERENCE_NAME,
            'OR',
          );

          // Step 4: search — modal closes, both records shown, search box reflects last row query
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.verifyRecordFound(testData.headings[0]);
          MarcAuthorities.verifyRecordFound(testData.headings[1]);
          MarcAuthorities.checkSearchInput(testData.headings[1]);

          // Step 5: reload — results and query persist
          cy.reload();
          MarcAuthorities.waitResultsLoading();
          MarcAuthorities.verifyRecordFound(testData.headings[0]);
          MarcAuthorities.verifyRecordFound(testData.headings[1]);
          MarcAuthorities.checkSearchInput(testData.headings[1]);

          // Steps 6-8: expand Date updated accordion and apply today's date range
          cy.intercept('GET', '**/search/authorities?limit=**').as('searchAfterDateFilter');
          MarcAuthoritiesSearch.filterByDateUpdated(todayText, todayText);
          cy.wait('@searchAfterDateFilter');
          cy.wait(1000); // making sure the UI has time to update the result list

          // Both records were created today so they still appear after the filter
          MarcAuthorities.verifyRecordFound(testData.headings[0]);
          MarcAuthorities.verifyRecordFound(testData.headings[1]);

          // Step 9: click the record — detail pane shows "Last updated" within today's range
          MarcAuthorities.selectItem(testData.headings[0]);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.headings[0]);
          MarcAuthority.contains(todayDisplayText);
        },
      );
    });
  });
});
