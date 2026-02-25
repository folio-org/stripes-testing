import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../support/constants';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const randomDigits = `440113${randomNDigitNumber(8)}`;
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag010: '010',
        tag100: '100',
        lccnSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.LCCN,
        keywordSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
      };
      const lccnTestData = [
        {
          heading: `AT_C440113_MarcAuthority 1 ${randomPostfix}`,
          lccn: `n ${randomDigits}`,
        },
        {
          heading: `AT_C440113_MarcAuthority 2 ${randomPostfix}`,
          lccn: `n  ${randomDigits}`,
        },
        {
          heading: `AT_C440113_MarcAuthority 3 ${randomPostfix}`,
          lccn: ` n${randomDigits}`,
        },
        {
          heading: `AT_C440113_MarcAuthority 4 ${randomPostfix}`,
          lccn: `  n${randomDigits}`,
        },
        {
          heading: `AT_C440113_MarcAuthority 5 ${randomPostfix}`,
          lccn: `  n  ${randomDigits}  `,
        },
        {
          heading: `AT_C440113_MarcAuthority 6 ${randomPostfix}`,
          lccn: `n${randomDigits}`,
        },
        {
          heading: `AT_C440113_MarcAuthority 7 ${randomPostfix}`,
          lccn: `N ${randomDigits}`,
        },
        {
          heading: `AT_C440113_MarcAuthority 8  ${randomPostfix}`,
          lccn: `N  ${randomDigits}`,
        },
        {
          heading: `AT_C440113_MarcAuthority 9 ${randomPostfix}`,
          lccn: ` N${randomDigits}`,
        },
        {
          heading: `AT_C440113_MarcAuthority 10 ${randomPostfix}`,
          lccn: `  N${randomDigits}`,
        },
        {
          heading: `AT_C440113_MarcAuthority 11 ${randomPostfix}`,
          lccn: `  N  ${randomDigits}  `,
        },
        {
          heading: `AT_C440113_MarcAuthority 12 ${randomPostfix}`,
          lccn: `N${randomDigits}`,
        },
      ];
      const allHeadings = lccnTestData.map((record) => record.heading);
      const searchQueries = [
        {
          query: `n${randomDigits}`,
          searchOption: testData.lccnSearchOption,
          expectedHeadings: allHeadings,
        },
        {
          query: `N${randomDigits}`,
          searchOption: testData.lccnSearchOption,
          expectedHeadings: allHeadings,
        },
        {
          query: `n ${randomDigits}`,
          searchOption: testData.lccnSearchOption,
          expectedHeadings: allHeadings,
        },
        {
          query: `N ${randomDigits}`,
          searchOption: testData.lccnSearchOption,
          expectedHeadings: allHeadings,
        },
        {
          query: `  n  ${randomDigits}  `,
          searchOption: testData.lccnSearchOption,
          expectedHeadings: allHeadings,
        },
        {
          query: `  N  ${randomDigits}  `,
          searchOption: testData.lccnSearchOption,
          expectedHeadings: allHeadings,
        },
        {
          query: `n ${randomDigits}`,
          searchOption: testData.keywordSearchOption,
          expectedHeadings: [allHeadings[0], allHeadings[6]],
        },
      ];
      const authData = {
        prefix: getRandomLetters(15),
        startsWithNumber: 1,
      };

      const createdAuthorityIds = [];
      let user;

      before('Create test data and login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C440113_MarcAuthority');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            user = userProperties;

            lccnTestData.forEach((recordData, index) => {
              const marcAuthorityFields = [
                {
                  tag: testData.tag010,
                  content: `$a ${recordData.lccn}`,
                  indicators: ['\\', '\\'],
                },
                {
                  tag: testData.tag100,
                  content: `$a ${recordData.heading}`,
                  indicators: ['1', '\\'],
                },
              ];
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                `${authData.startsWithNumber + index}`,
                marcAuthorityFields,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          Users.deleteViaApi(user.userId);
        });
      });

      it(
        'C440113 Search for "MARC authority" by "LCCN" option using a query with lower, UPPER case when "LCCN" (010 $a) has (leading, internal, trailing) spaces. (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C440113'] },
        () => {
          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.verifySearchTabIsOpened();

          cy.ifConsortia(true, () => {
            MarcAuthorities.clickAccordionByName('Shared');
            MarcAuthorities.verifySharedAccordionOpen(true);
            MarcAuthorities.actionsSelectCheckbox('No');
          });

          searchQueries.forEach((search, index) => {
            if (index > 0) {
              MarcAuthorities.clickResetAndCheck();
            }
            MarcAuthorities.searchByParameter(search.searchOption, search.query);
            cy.ifConsortia(true, () => {
              MarcAuthorities.actionsSelectCheckbox('No');
            });

            allHeadings.forEach((heading) => {
              MarcAuthorities.verifyRecordFound(heading, search.expectedHeadings.includes(heading));
            });
          });
        },
      );
    });
  });
});
