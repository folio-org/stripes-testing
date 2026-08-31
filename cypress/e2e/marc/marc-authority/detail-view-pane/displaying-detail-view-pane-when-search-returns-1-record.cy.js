import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Detail view pane', () => {
      const randomPostfix = getRandomPostfix();
      const authData = {
        prefix: getRandomLetters(17),
        startWithNumber: 3509640,
      };
      const testData = {
        authorityHeadingPrefix: `AT_C350964_MarcAuthority_${randomPostfix}`,
      };

      const authorityHeadings = [
        `${testData.authorityHeadingPrefix}_1`,
        `${testData.authorityHeadingPrefix}_2`,
        `${testData.authorityHeadingPrefix}_3`,
      ];

      const authorityFields = [
        [
          {
            tag: '151',
            content: `$a ${authorityHeadings[0]}`,
            indicators: ['\\', '\\'],
          },
        ],
        [
          {
            tag: '100',
            content: `$a ${authorityHeadings[1]}`,
            indicators: ['\\', '\\'],
          },
        ],
        [
          {
            tag: '110',
            content: `$a ${authorityHeadings[2]}`,
            indicators: ['\\', '\\'],
          },
        ],
      ];

      const createdAuthorityIds = [];
      let user;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C350964_');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            authorityFields.forEach((fields, index) => {
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber + index,
                fields,
              ).then((authorityId) => {
                createdAuthorityIds.push(authorityId);
              });
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIds.forEach((authorityId) => {
          MarcAuthority.deleteViaAPI(authorityId, true);
        });
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C350964 Displaying detail view pane automatically when search return 1 record (promin)',
        { tags: ['extendedPath', 'promin', 'C350964'] },
        () => {
          // Steps 1-3: Search with unique heading → 1 result → detail view opens automatically
          MarcAuthoritiesSearch.searchBy(
            MARC_AUTHORITY_SEARCH_OPTIONS.GEOGRAPHIC_NAME,
            authorityHeadings[0],
          );
          MarcAuthorities.checkRowsCount(1);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityHeadings[0]);
          MarcAuthorities.checkRowUpdatedAndHighlighted(authorityHeadings[0]);
          MarcAuthority.checkViewPaneInFocus();

          // Step 4: Close detail view → only 1 result remains in list; detail pane is closed
          MarcAuthority.closeAuthorityViewPane();
          MarcAuthorities.checkRowsCount(1);

          // Steps 5-6: Search to get multiple records; click any → detail view opens
          MarcAuthorities.searchBy(
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            testData.authorityHeadingPrefix,
          );
          MarcAuthorities.checkRowsCountExistance(3);
          MarcAuthorities.selectFirstRecord();
          MarcAuthority.waitLoading();
          MarcAuthority.checkViewPaneInFocus();
        },
      );
    });
  });
});
