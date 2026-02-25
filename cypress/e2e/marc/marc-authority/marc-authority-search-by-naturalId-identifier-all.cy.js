import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(8);
      const testData = {
        authorityHeading: `AT_C378891_MarcAuthority_${randomPostfix}`,
        tag010: '010',
        tag150: '150',
        keywordSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        identifierAllSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.IDENTIFIER_ALL,
        tag001Identifier: `${randomDigits}378891001`,
        tag010Identifier: `sj 378891${randomDigits}010`,
      };
      const authData = {
        prefix: '',
        startWithNumber: testData.tag001Identifier,
      };
      const authorityFields = [
        {
          tag: testData.tag010,
          content: `$a ${testData.tag010Identifier}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag150,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['\\', '\\'],
        },
      ];
      const searchQueries = [
        testData.tag010Identifier.replace(' ', ''),
        testData.tag010Identifier,
        testData.tag001Identifier,
      ];

      let createdAuthorityId;
      let user;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C378891');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((createdUserProperties) => {
            user = createdUserProperties;

            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber,
              authorityFields,
            ).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;
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
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C378891 Verify that "Identifier (all)" option search by "naturalId" field when it\'s filled from "010" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C378891'] },
        () => {
          searchQueries.forEach((query) => {
            MarcAuthorities.searchByParameter(testData.identifierAllSearchOption, query);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading);
            MarcAuthorities.clickResetAndCheck(query);
          });
        },
      );
    });
  });
});
