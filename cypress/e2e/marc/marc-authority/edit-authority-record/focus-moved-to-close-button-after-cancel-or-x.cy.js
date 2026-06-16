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

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const field001value = `${getRandomLetters(15)}494059${randomNDigitNumber(4)}`;
      const tag100 = '100';
      const authorityHeading = `AT_C494059_MarcAuthority_${randomPostfix}`;

      let authorityId;
      let userProperties;

      before('Create user, data', () => {
        cy.getAdminToken();

        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C494059_');

        cy.then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI('', field001value, [
            {
              tag: tag100,
              content: `$a ${authorityHeading}`,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            authorityId = id;
          });
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUser) => {
          userProperties = createdUser;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });

          MarcAuthorities.searchBeats(authorityHeading);
          MarcAuthorities.selectAuthorityById(authorityId);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityHeading);
        });
      });

      after('Cleanup', () => {
        cy.getAdminToken();
        if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
        if (userProperties) Users.deleteViaApi(userProperties.userId);
      });

      it(
        'C494059 Focus is moved to "X" icon of detail view when user clicks on the "Cancel"/"X" button in the "Edit MARC authority record" window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C494059'] },
        () => {
          // Step 1: Click Actions → Edit → "Edit MARC authority record" pane opens
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          // Step 2: Click "Cancel" → pane closes, detail view opens, focus on "X" icon
          QuickMarcEditor.pressCancel();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityHeading);
          MarcAuthority.checkCloseButtonInFocus();

          // Step 3: Click Actions → Edit again → "Edit MARC authority record" pane opens
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          // Step 4: Click "X" button on editor pane → pane closes, detail view opens, focus on "X" icon
          QuickMarcEditor.closeAuthorityEditorPane();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityHeading);
          MarcAuthority.checkCloseButtonInFocus();
        },
      );
    });
  });
});
