import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomFourDigitNumber();
    const testData = {
      tag100: '100',
      authorityHeadingPrefix: `AT_C360539_MarcAuthority_${randomPostfix}`,
      naturalId: `360539${randomDigits}${randomDigits}`,
    };
    const authorityHeadings = [
      `${testData.authorityHeadingPrefix}_A`,
      `${testData.authorityHeadingPrefix}_B`,
    ];
    const marcAuthorityFieldsA = [
      {
        tag: testData.tag100,
        content: `$a ${authorityHeadings[0]}`,
        indicators: ['1', '\\'],
      },
    ];
    const marcAuthorityFieldsB = [
      {
        tag: testData.tag100,
        content: `$a ${authorityHeadings[1]}`,
        indicators: ['1', '\\'],
      },
    ];

    const createdAuthorityIds = [];

    before('Creating user', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C360539_MarcAuthority');

      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          [marcAuthorityFieldsA, marcAuthorityFieldsB].forEach((marcAuthorityFields, index) => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              '',
              `${testData.naturalId}${index}`,
              marcAuthorityFields,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
          MarcAuthorities.verifySearchTabIsOpened();
        },
      );
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdAuthorityIds.forEach((createdAuthorityId) => {
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
      });
    });

    it(
      'C360539 "Search & filter" pane collapsing and expanding when searching for records (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C360539'] },
      () => {
        MarcAuthoritiesSearch.collapseSearchPane();
        MarcAuthoritiesSearch.verifySearchPaneIsCollapsed(true);

        MarcAuthoritiesSearch.expandSearchPane();
        MarcAuthoritiesSearch.verifySearchPaneExpanded(true);

        MarcAuthoritiesSearch.fillSearchInput(testData.authorityHeadingPrefix);
        MarcAuthoritiesSearch.selectSearchOption(MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME);

        MarcAuthoritiesSearch.collapseSearchPane();
        MarcAuthoritiesSearch.verifySearchPaneIsCollapsed(true);

        MarcAuthoritiesSearch.clickShowFilters();
        MarcAuthoritiesSearch.verifySearchPaneExpanded(true);
        MarcAuthoritiesSearch.verifySelectedSearchOption(
          MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
        );
        MarcAuthoritiesSearch.checkSearchQuery(testData.authorityHeadingPrefix);

        MarcAuthoritiesSearch.clickSearchButton();
        MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        authorityHeadings.forEach((heading) => {
          MarcAuthorities.verifyRecordFound(heading);
        });

        MarcAuthoritiesSearch.collapseSearchPane();
        MarcAuthoritiesSearch.verifySearchPaneIsCollapsed();
        MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        authorityHeadings.forEach((heading) => {
          MarcAuthorities.verifyRecordFound(heading);
        });

        MarcAuthoritiesSearch.expandSearchPane();
        MarcAuthoritiesSearch.verifySearchPaneExpanded();
        MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        MarcAuthoritiesSearch.verifySelectedSearchOption(
          MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
        );
        MarcAuthoritiesSearch.checkSearchQuery(testData.authorityHeadingPrefix);
        authorityHeadings.forEach((heading) => {
          MarcAuthorities.verifyRecordFound(heading);
        });

        MarcAuthorities.selectRecordByIndex(0);
        MarcAuthority.waitLoading();

        MarcAuthoritiesSearch.collapseSearchPane();
        MarcAuthoritiesSearch.verifySearchPaneIsCollapsed();
        MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        authorityHeadings.forEach((heading) => {
          MarcAuthorities.verifyRecordFound(heading);
        });
        MarcAuthority.waitLoading();

        MarcAuthoritiesSearch.expandSearchPane();
        MarcAuthoritiesSearch.verifySearchPaneExpanded();
        MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        MarcAuthoritiesSearch.verifySelectedSearchOption(
          MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
        );
        MarcAuthoritiesSearch.checkSearchQuery(testData.authorityHeadingPrefix);
        authorityHeadings.forEach((heading) => {
          MarcAuthorities.verifyRecordFound(heading);
        });
        MarcAuthority.waitLoading();
      },
    );
  });
});
