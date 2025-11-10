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
      tag410: '410',
      tag530: '530',
      authorityHeadingPrefix: `AT_C446121_MarcAuthority_${randomPostfix}`,
      naturalId: `446121${randomDigits}${randomDigits}`,
      searchOptions: [
        MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        MARC_AUTHORITY_SEARCH_OPTIONS.CORPORATE_CONFERENCE_NAME,
        MARC_AUTHORITY_SEARCH_OPTIONS.UNIFORM_TITLE,
      ],
    };
    const getExpectedTitle = (query) => {
      return query ? `MARC authority - ${query} - FOLIO` : 'MARC authority - FOLIO';
    };
    const authorityHeadings = {
      personalName: `${testData.authorityHeadingPrefix}_personalName`,
      corporateName: `${testData.authorityHeadingPrefix}_corporateName`,
      uniformTitle: `${testData.authorityHeadingPrefix}_uniformTitle`,
    };
    const marcAuthorityFields = [
      {
        tag: testData.tag100,
        content: `$a ${authorityHeadings.personalName}`,
        indicators: ['1', '\\'],
      },
      {
        tag: testData.tag410,
        content: `$a ${authorityHeadings.corporateName}`,
        indicators: ['1', '\\'],
      },
      {
        tag: testData.tag530,
        content: `$a ${authorityHeadings.uniformTitle}`,
        indicators: ['1', '\\'],
      },
    ];

    let createdAuthorityId;

    before('Creating user, data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C446121_MarcAuthority');

      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            '',
            testData.naturalId,
            marcAuthorityFields,
          ).then((createdRecordId) => {
            createdAuthorityId = createdRecordId;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
          });
        },
      );
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
    });

    it(
      'C446121 Check page title (browser tab) when opening 1XX, 4XX, 5XX headings (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C446121'] },
      () => {
        testData.searchOptions.forEach((searchOption, index) => {
          MarcAuthoritiesSearch.selectSearchOption(searchOption);
          MarcAuthorities.searchBeats(Object.values(authorityHeadings)[index]);
          MarcAuthority.waitLoading();
          MarcAuthority.verifyValueHighlighted(Object.values(authorityHeadings)[index]);
          cy.title().should('eq', getExpectedTitle(Object.values(authorityHeadings)[index]));

          MarcAuthorities.clickResetAndCheck();
          cy.title().should('eq', getExpectedTitle());
        });
      },
    );
  });
});
