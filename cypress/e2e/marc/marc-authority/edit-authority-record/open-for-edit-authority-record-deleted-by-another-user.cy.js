import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import { AUTHORITY_TYPES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(13);
      const randomDigits = `358941${randomNDigitNumber(6)}`;

      const testData = {
        authorityHeading: `AT_C358941_MarcAuthority_${randomPostfix}`,
        field1XXUpdatedContent: `$a AT_C358941_MarcAuthority_${randomPostfix} test`,
        naturalId: `${randomLetters}${randomDigits}`,
        errorMessage: 'Record cannot be found or loaded.',
      };

      const marcAuthFields = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      const userAPermissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];

      const userBPermissions = [
        ...userAPermissions,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      ];

      let userA;
      let userB;
      let authorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C358941_');

        MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', marcAuthFields).then(
          (id) => {
            authorityId = id;
          },
        );

        cy.createTempUser(userAPermissions).then((userProperties) => {
          userA = userProperties;
        });

        cy.createTempUser(userBPermissions).then((userProperties) => {
          userB = userProperties;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (userA?.userId) Users.deleteViaApi(userA.userId);
        if (userB?.userId) Users.deleteViaApi(userB.userId);
        MarcAuthority.deleteViaAPI(authorityId, true);
      });

      it(
        'C358941 Edit the "MARC Authority" record deleted by another user (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C358941'] },
        () => {
          // Steps 1-3: User A searches for the record and opens it for view
          cy.login(userA.username, userA.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectItem(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);

          // Steps 4-7: User B (via API) deletes the same record that User A is viewing
          cy.then(() => {
            cy.getToken(userB.username, userB.password);
            MarcAuthority.deleteViaAPI(authorityId);
            cy.recurse(
              () => MarcAuthorities.getMarcAuthoritiesViaApi({
                query: `keyword="${testData.authorityHeading}" and authRefType=="${AUTHORITY_TYPES.AUTHORIZED}"`,
              }),
              (foundAuthorities) => foundAuthorities.length === 0,
              { limit: 10, timeout: 12000, delay: 1000 },
            );
            cy.getToken(userA.username, userA.password);
          }).then(() => {
            // Step 7: Open for edit by User A → check error toast message
            MarcAuthority.edit({ verifyQuickMarcOpened: false });
            MarcAuthorities.checkAfterDelete(testData.authorityHeading);
            MarcAuthorities.verifyRecordNotFoundCallout();
          });
        },
      );
    });
  });
});
