import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS, AUTHORITY_TYPES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(8);
      const testData = {
        authorityHeadingPrefix: `AT_C350642_MarcAuthority_${randomPostfix}`,
        tag010: '010',
        tag150: '150',
        tag450: '450',
        tag550: '550',
        keywordSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        identifierAllSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.IDENTIFIER_ALL,
      };
      const lccnValues = [`nt350642${randomDigits}`, `nb${randomDigits}350642\\`];
      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: 1,
      };
      const authorityFields1 = [
        {
          tag: testData.tag010,
          content: `$a ${authData.prefix}${authData.startWithNumber} $z ${lccnValues[0]}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag150,
          content: `$a ${testData.authorityHeadingPrefix}_150_1`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag450,
          content: `$a ${testData.authorityHeadingPrefix}_450_1`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag550,
          content: `$w g $a ${testData.authorityHeadingPrefix}_550a_1`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag550,
          content: `$w g $a ${testData.authorityHeadingPrefix}_550b_1 $z Washington (State)`,
          indicators: ['\\', '\\'],
        },
      ];
      const authorityFields2 = [
        {
          tag: testData.tag010,
          content: `$a ${authData.prefix}${authData.startWithNumber + 1} $z ${lccnValues[1]}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag150,
          content: `$a ${testData.authorityHeadingPrefix}_150_2`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag450,
          content: `$a ${testData.authorityHeadingPrefix}_450_2`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag550,
          content: `$w g $a ${testData.authorityHeadingPrefix}_550a_2`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag550,
          content: `$w g $a ${testData.authorityHeadingPrefix}_550b_2`,
          indicators: ['\\', '\\'],
        },
      ];
      const authHeadings1 = [
        { value: `${testData.authorityHeadingPrefix}_150_1`, type: AUTHORITY_TYPES.AUTHORIZED },
        { value: `${testData.authorityHeadingPrefix}_450_1`, type: AUTHORITY_TYPES.REFERENCE },
        { value: `${testData.authorityHeadingPrefix}_550a_1`, type: AUTHORITY_TYPES.AUTH_REF },
        {
          value: `${testData.authorityHeadingPrefix}_550b_1 Washington (State)`,
          type: AUTHORITY_TYPES.AUTH_REF,
        },
      ];
      const authHeadings2 = [
        { value: `${testData.authorityHeadingPrefix}_150_2`, type: AUTHORITY_TYPES.AUTHORIZED },
        { value: `${testData.authorityHeadingPrefix}_450_2`, type: AUTHORITY_TYPES.REFERENCE },
        { value: `${testData.authorityHeadingPrefix}_550a_2`, type: AUTHORITY_TYPES.AUTH_REF },
        { value: `${testData.authorityHeadingPrefix}_550b_2`, type: AUTHORITY_TYPES.AUTH_REF },
      ];
      const searchDataIdentifierAll = [
        {
          query: lccnValues[0],
          expectedHeadings: authHeadings1.filter(
            (heading) => heading.type === AUTHORITY_TYPES.AUTHORIZED,
          ),
        },
        {
          query: `${lccnValues[1].slice(0, -2)}*`,
          expectedHeadings: authHeadings2.filter(
            (heading) => heading.type === AUTHORITY_TYPES.AUTHORIZED,
          ),
        },
        {
          query: `**${lccnValues[0].slice(2)}`,
          expectedHeadings: authHeadings1.filter(
            (heading) => heading.type === AUTHORITY_TYPES.AUTHORIZED,
          ),
        },
      ];
      const searchDataKeyword = [
        { query: lccnValues[1], expectedHeadings: authHeadings2 },
        { query: `**${lccnValues[0].slice(2)}`, expectedHeadings: authHeadings1 },
        { query: `${lccnValues[1].slice(0, -2)}*`, expectedHeadings: authHeadings2 },
      ];

      const createdAuthorityIds = [];
      let user;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C350642');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((createdUserProperties) => {
            user = createdUserProperties;

            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber,
              authorityFields1,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber + 1,
              authorityFields2,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
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
        createdAuthorityIds.forEach((id) => MarcAuthorities.deleteViaAPI(id, true));
        Users.deleteViaApi(user.userId);
      });

      it(
        'C350642 Search MARC: support searching Library of Congress Control Number - 010 field $z subfield (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C350642'] },
        () => {
          MarcAuthorities.checkSearchOptions();
          MarcAuthorities.selectSearchOptionInDropdown(testData.identifierAllSearchOption);
          MarcAuthorities.checkSelectOptionFieldContent(testData.identifierAllSearchOption);

          searchDataIdentifierAll.forEach(({ query, expectedHeadings }) => {
            MarcAuthorities.searchBeats(query);
            MarcAuthorities.checkRowsCount(expectedHeadings.length);
            expectedHeadings.forEach(({ value, type }) => {
              MarcAuthorities.verifyResultsRowContent(value, type);
            });
          });

          MarcAuthorities.selectSearchOptionInDropdown(testData.keywordSearchOption);
          MarcAuthorities.checkSelectOptionFieldContent(testData.keywordSearchOption);

          searchDataKeyword.forEach(({ query, expectedHeadings }) => {
            MarcAuthorities.searchBeats(query);
            MarcAuthorities.checkRowsCount(expectedHeadings.length);
            expectedHeadings.forEach(({ value, type }) => {
              MarcAuthorities.verifyResultsRowContent(value, type);
            });
          });
        },
      );
    });
  });
});
