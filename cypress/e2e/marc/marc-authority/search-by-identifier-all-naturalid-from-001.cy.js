import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS, AUTHORITY_TYPES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `378892${randomNDigitNumber(15)}`;
    const randomLetterPrefix = getRandomLetters(12);
    const randomNumericSuffix = `378892${randomNDigitNumber(7)}`;

    const testData = {
      searchOptions: {
        IDENTIFIER_ALL: MARC_AUTHORITY_SEARCH_OPTIONS.IDENTIFIER_ALL,
      },
      authorizedType: AUTHORITY_TYPES.AUTHORIZED,
      // 001 field - valid "n" prefix for existing source file
      authority_001: `n  ${randomDigits}`,
      // 010 $a field - random letters prefix for non-existing source file
      authority_010a: `${randomLetterPrefix} ${randomNumericSuffix}`,
      authorityHeading: `AT_C378892_MarcAuthority_${randomPostfix}`,
    };

    const searchQueries = [
      `n${randomDigits}`,
      `n  ${randomDigits}`,
      `${randomLetterPrefix} ${randomNumericSuffix}`,
      `${randomLetterPrefix}${randomNumericSuffix}`,
    ];

    const marcAuthFields = [
      {
        tag: '010',
        content: `$a ${testData.authority_010a}`,
        indicators: ['\\', '\\'],
      },
      {
        tag: '100',
        content: `$a ${testData.authorityHeading}`,
        indicators: ['1', '\\'],
      },
    ];

    let user;
    let authorityId;

    before('Create users, data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C378892_');

      // Create MARC Authority record with 001 field (naturalId with valid prefix)
      MarcAuthorities.createMarcAuthorityViaAPI(testData.authority_001, '', marcAuthFields).then(
        (id) => {
          authorityId = id;
        },
      );

      // Create User
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        },
      );
    });

    after('Delete users, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      MarcAuthority.deleteViaAPI(authorityId);
    });

    it(
      'C378892 Verify that "Identifier (all)" option search by "naturalId" field when it\'s filled from "001" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C378892'] },
      () => {
        // Steps 1-3: Select "Identifier (all)" option from dropdown,
        // Fill in search box with identifier from 001 field without spaces (n79041362) and click Search
        MarcAuthorities.searchBy(testData.searchOptions.IDENTIFIER_ALL, searchQueries[0]);
        // Verify search completed and MARC authority record is displayed
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.checkAfterSearch(testData.authorizedType, testData.authorityHeading);

        // Steps 4-5: Update search box with identifier from 001 field with spaces (n  79041362) and click Search
        MarcAuthorities.clickResetAndCheck(searchQueries[0]);
        MarcAuthorities.searchBy(testData.searchOptions.IDENTIFIER_ALL, searchQueries[1]);
        // Verify search completed and MARC authority record is displayed
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.checkAfterSearch(testData.authorizedType, testData.authorityHeading);

        // Steps 6-7: Update search box with identifier from 010 $a field with spaces (tst 4215421) and click Search
        MarcAuthorities.clickResetAndCheck(searchQueries[1]);
        MarcAuthorities.searchBy(testData.searchOptions.IDENTIFIER_ALL, searchQueries[2]);
        // Verify search completed and MARC authority record is displayed
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.checkAfterSearch(testData.authorizedType, testData.authorityHeading);

        // Steps 8-9: Update search box with identifier from 010 $a field without spaces (tst4215421) and click Search
        MarcAuthorities.clickResetAndCheck(searchQueries[2]);
        MarcAuthorities.searchBy(testData.searchOptions.IDENTIFIER_ALL, searchQueries[3]);
        // Verify search completed and MARC authority record is NOT displayed
        MarcAuthorities.verifyEmptySearchResults(searchQueries[3]);
      },
    );
  });
});
