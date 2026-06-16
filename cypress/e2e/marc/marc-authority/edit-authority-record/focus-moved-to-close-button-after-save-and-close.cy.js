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
      const field001value = `${getRandomLetters(15)}494058${randomNDigitNumber(4)}`;
      const tag100 = '100';
      const authorityHeading = `AT_C494058_MarcAuthority_${randomPostfix}`;
      const updatedHeading = `AT_C494058_MarcAuthority_Updated_${randomPostfix}`;

      let authorityId;
      let userProperties;

      before('Create user, data', () => {
        cy.getAdminToken();

        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C494058_');

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
        'C494058 Focus is moved to "X" icon of detail view when user clicks on the "Save & close" button in the "Edit MARC authority record" window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C494058'] },
        () => {
          // Step 1: Click Actions → Edit → "Edit MARC authority record" pane opens
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          // Step 2: Update a field
          QuickMarcEditor.updateExistingField(tag100, `$a ${updatedHeading}`);
          QuickMarcEditor.checkContentByTag(tag100, `$a ${updatedHeading}`);

          // Step 3: Click "Save & close"
          MarcAuthority.clickSaveAndCloseButton();

          // Verify: success notification shown, detail view displayed with saved changes
          MarcAuthority.verifyAfterSaveAndClose();
          MarcAuthority.contains(updatedHeading);

          // Verify: focus (cursor) is on the close button in detail view pane (third pane)
          MarcAuthority.checkCloseButtonInFocus();
        },
      );
    });
  });
});
