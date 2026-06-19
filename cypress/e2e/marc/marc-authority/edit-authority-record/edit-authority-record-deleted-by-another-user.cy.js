import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
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
      const randomDigits = `353637${randomNDigitNumber(6)}`;

      const testData = {
        authorityHeading: `AT_C353637_MarcAuthority_${randomPostfix}`,
        field1XXUpdatedContent: `$a AT_C353637_MarcAuthority_${randomPostfix} test`,
        naturalId: `${randomLetters}${randomDigits}`,
        errorMessageDeletedByAnotherUser:
          'This record has been deleted by another user. You can no longer edit this record, hit the cancel button to return to the previous page.',
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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C353637_');

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
        'C353637 Editing the "MARC Authority" record deleted by another user (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C353637'] },
        () => {
          // Steps 1-4: User A searches for the record and opens it for editing
          cy.login(userA.username, userA.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectItem(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          // Steps 5-7: User B (via API) deletes the same record while User A is editing
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
            // Step 8: User A edits 1XX field
            QuickMarcEditor.updateExistingField('100', testData.field1XXUpdatedContent);

            // Step 9: User A clicks "Save & close" - error toast appears
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkCallout(testData.errorMessageDeletedByAnotherUser);

            // Step 10: User A clicks "Cancel"
            QuickMarcEditor.pressCancel();

            // Verify: detail view closed, record not in search results
            MarcAuthorities.checkAfterDelete(testData.authorityHeading);
            MarcAuthorities.verifyEmptySearchResults(testData.authorityHeading);
          });
        },
      );
    });
  });
});
