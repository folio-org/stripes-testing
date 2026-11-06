import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Detail view pane', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(13);
      const randomDigits = `358940${randomNDigitNumber(6)}`;

      const testData = {
        authorityHeading: `AT_C358940_MarcAuthority_${randomPostfix}`,
        naturalId: `${randomLetters}${randomDigits}`,
      };

      const marcAuthFields = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      const userAPermissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C358940_');

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
        cy.getAdminToken(false);
        if (userA?.userId) Users.deleteViaApi(userA.userId);
        if (userB?.userId) Users.deleteViaApi(userB.userId);
        MarcAuthority.deleteViaAPI(authorityId, true);
      });

      it(
        'C358940 Open the "MARC Authority" record deleted by another user (promin)',
        { tags: ['extendedPath', 'promin', 'C358940'] },
        () => {
          // Steps 1-2: navigate to MARC Authority, search for the record
          cy.login(userA.username, userA.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.verifyRecordFound(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyViewPaneContentExists(false);

          // Steps 3-6 (via API): User B deletes the record while User A's search results remain visible
          cy.then(() => {
            cy.getToken(userB.username, userB.password);
            MarcAuthority.deleteViaAPI(authorityId);
            cy.recurse(
              () => MarcAuthorities.getMarcAuthoritiesViaApi({
                query: `id==${authorityId}`,
              }),
              (foundAuthorities) => foundAuthorities.length === 0,
              { limit: 18, timeout: 20000, delay: 1000 },
            );
            cy.getToken(userA.username, userA.password);
          }).then(() => {
            // Step 7: click the stale record row - the deleted record is not opened
            MarcAuthorities.selectItem(testData.authorityHeading);
            MarcAuthorities.verifyViewPaneContentExists(false);
          });
        },
      );
    });
  });
});
