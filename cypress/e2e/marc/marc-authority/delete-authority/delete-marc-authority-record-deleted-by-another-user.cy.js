import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS, AUTHORITY_TYPES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Delete Authority', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(13);
      const randomDigits = `358943${randomNDigitNumber(6)}`;

      const testData = {
        authorityHeading: `AT_C358943_MarcAuthority_${randomPostfix}`,
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        naturalId: `${randomLetters}${randomDigits}`,
      };

      const marcAuthFields = [
        {
          tag: '110',
          content: `$a ${testData.authorityHeading}`,
          indicators: ['2', '\\'],
        },
      ];

      const userPermissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      ];

      let userA;
      let userB;
      let authorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C358943_');

        MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', marcAuthFields).then(
          (id) => {
            authorityId = id;
          },
        );

        cy.createTempUser(userPermissions).then((userProperties) => {
          userA = userProperties;
        });

        cy.createTempUser(userPermissions).then((userProperties) => {
          userB = userProperties;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
        MarcAuthority.deleteViaAPI(authorityId, true);
      });

      it(
        'C358943 Delete the "MARC Authority" record deleted by another user (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C358943'] },
        () => {
          // Steps 1-3: User A navigates to MARC Authority, searches for record, opens detail view
          cy.login(userA.username, userA.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
          MarcAuthorities.selectItem(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);

          // Steps 4-7: User B (via API) deletes the same record and waits for deletion to propagate
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
            // Step 8: User A tries to delete the already-deleted record
            MarcAuthoritiesDelete.clickDeleteButton();
            MarcAuthoritiesDelete.checkDeleteModal();
            MarcAuthoritiesDelete.confirmDelete();

            // Expected: Error callout "Unable to delete MARC authority record <<1XX value>>. Please try again."
            MarcAuthoritiesDelete.checkDeleteErrorCallout(testData.authorityHeading);
          });
        },
      );
    });
  });
});
