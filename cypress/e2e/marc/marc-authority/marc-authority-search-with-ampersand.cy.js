import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C350734_MarcAuthority_${randomPostfix}`,
        authority510Value: `ATC350734 & MarcAuthority ${randomPostfix} (Firm)`,
        tag100: '100',
        tag510: '510',
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.CORPORATE_CONFERENCE_NAME,
      };

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: 1,
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag510,
          content: `$a ${testData.authority510Value}`,
          indicators: ['2', '\\'],
        },
      ];

      let createdAuthorityId;
      let user;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C350734');

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
              authRefresh: true,
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C350734 Search for MARC authority record with " & " symbol in the title (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C350734'] },
        () => {
          MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);

          MarcAuthorities.searchBeats(testData.authority510Value);
          MarcAuthorities.verifyRecordFound(testData.authority510Value);
        },
      );
    });
  });
});
