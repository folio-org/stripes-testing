import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../support/constants';
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
      tag400: '400',
      tag500: '500',
      tag110: '110',
      tag410: '410',
      tag510: '510',
      authorityHeadingPrefix: `AT_C442844_MarcAuthority_${randomPostfix}`,
      naturalId: `442844${randomDigits}${randomDigits}`,
      authorizedType: 'Authorized',
      searchQueries: {
        basic: `AT_C442844_BasicSearch_${randomPostfix}`,
        advanced: `keyword containsAll AT_C442844_AdvSearch_${randomPostfix}`,
      },
      expectedTitles: {
        default: 'MARC authority - FOLIO',
        basicSearch: `MARC authority - AT_C442844_BasicSearch_${randomPostfix} - Search - FOLIO`,
        basicSearch2: `MARC authority - AT_C442844_MarcAuthority_${randomPostfix} - Search - FOLIO`,
        basicSearch3: `MARC authority - AT_C442844_MarcAuthority_${randomPostfix}_B - Search - FOLIO`,
        querySearch: `MARC authority - title="AT_C442844_QuerySearch_${randomPostfix}" - Search - FOLIO`,
        advancedSearch: `MARC authority - keyword containsAll AT_C442844_AdvSearch_${randomPostfix} - Search - FOLIO`,
        advancedSearch2: `MARC authority - keyword containsAll AT_C442844_BasicSearch_${randomPostfix} - Search - FOLIO`,
      },
      typesOfHeading: ['Corporate Name', 'Personal Name'],
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
      {
        tag: testData.tag400,
        content: `$a ${authorityHeadings[0]} - Field 400`,
        indicators: ['1', '\\'],
      },
      {
        tag: testData.tag500,
        content: `$a ${authorityHeadings[0]} - Field 500`,
        indicators: ['1', '\\'],
      },
    ];
    const marcAuthorityFieldsB = [
      {
        tag: testData.tag110,
        content: `$a ${authorityHeadings[0]} B`,
        indicators: ['1', '\\'],
      },
      {
        tag: testData.tag410,
        content: `$a ${authorityHeadings[0]} - Field 410`,
        indicators: ['1', '\\'],
      },
      {
        tag: testData.tag510,
        content: `$a ${authorityHeadings[0]} - Field 510`,
        indicators: ['1', '\\'],
      },
    ];

    const createdAuthorityIds = [];

    before('Creating user, data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C442844_MarcAuthority');

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
        },
      );
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdAuthorityIds.forEach((createdAuthorityId) => {
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
      });
    });

    it(
      'C442844 Check page title (browser tab) when searching in "MARC authority" app (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C442844'] },
      () => {
        MarcAuthoritiesSearch.fillSearchInput(testData.searchQueries.basic);
        cy.title().should('eq', testData.expectedTitles.default);

        MarcAuthoritiesSearch.clickSearchButton();
        cy.title().should('eq', testData.expectedTitles.basicSearch);

        MarcAuthorities.clickResetAndCheck();
        cy.title().should('eq', testData.expectedTitles.default);

        MarcAuthorities.selectSearchOptionInDropdown(MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH);
        MarcAuthoritiesSearch.fillSearchInput(testData.searchQueries.advanced);
        MarcAuthoritiesSearch.clickSearchButton();
        cy.title().should('eq', testData.expectedTitles.advancedSearch);

        MarcAuthorities.clickResetAndCheck();
        cy.title().should('eq', testData.expectedTitles.default);

        MarcAuthorities.clickAdvancedSearchButton();
        MarcAuthorities.fillAdvancedSearchField(
          0,
          testData.searchQueries.basic,
          MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        );
        MarcAuthorities.clickSearchButton();
        cy.title().should('eq', testData.expectedTitles.advancedSearch2);

        MarcAuthorities.clickResetAndCheck();
        cy.title().should('eq', testData.expectedTitles.default);

        MarcAuthoritiesSearch.selectExcludeReferencesFilter();
        MarcAuthorities.chooseTypeOfHeading(testData.typesOfHeading[0]);
        cy.title().should('eq', testData.expectedTitles.default);

        MarcAuthorities.searchBeats(testData.authorityHeadingPrefix);
        cy.title().should('eq', testData.expectedTitles.basicSearch2);

        MarcAuthorities.chooseTypeOfHeading(testData.typesOfHeading[1]);
        MarcAuthoritiesSearch.selectExcludeReferencesFilter(
          REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
        );
        cy.title().should('eq', testData.expectedTitles.basicSearch2);

        MarcAuthorities.clickResetAndCheck();
        cy.title().should('eq', testData.expectedTitles.default);

        MarcAuthorities.searchBeats(authorityHeadings[1]);
        MarcAuthority.waitLoading();
        cy.title().should('eq', testData.expectedTitles.basicSearch3);
      },
    );
  });
});
