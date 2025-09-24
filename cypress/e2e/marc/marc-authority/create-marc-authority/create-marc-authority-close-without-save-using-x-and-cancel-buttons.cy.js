import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Close "Create a new MARC authority record" window without save', () => {
      const testData = {
        headerText: /New .*MARC authority record/,
        authorityFileValue: 'n000232',
        tag010: '010',
        tag100Content: '$a C663333 Close window test',
        tag100: '100',
      };
      let user;
      const LC_NAME_AUTHORITY_FILE = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;

      before('Create user and login', () => {
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;
          MarcAuthorities.setAuthoritySourceFileActivityViaAPI(LC_NAME_AUTHORITY_FILE);
          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C663333 Close "Create a new MARC authority record" window without save using "Cancel" and "X" buttons (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C663333'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);

          QuickMarcEditor.pressCancel();
          MarcAuthorities.waitLoading();

          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);

          QuickMarcEditor.closeUsingCrossButton();
          MarcAuthorities.waitLoading();

          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);
          MarcAuthority.selectSourceFile(LC_NAME_AUTHORITY_FILE);

          QuickMarcEditor.addNewField(testData.tag010, testData.authorityFileValue, 3);
          QuickMarcEditor.addNewField(testData.tag100, testData.tag100Content, 4);
          QuickMarcEditor.closeWithoutSavingAfterChange();
          MarcAuthorities.waitLoading();

          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);
          MarcAuthority.selectSourceFile(LC_NAME_AUTHORITY_FILE);
          QuickMarcEditor.addNewField(testData.tag010, testData.authorityFileValue, 3);
          QuickMarcEditor.addNewField(testData.tag100, testData.tag100Content, 4);

          QuickMarcEditor.closeUsingCrossButton();
          QuickMarcEditor.closeWithoutSavingInEditConformation();
          MarcAuthorities.waitLoading();
        },
      );
    });
  });
});
