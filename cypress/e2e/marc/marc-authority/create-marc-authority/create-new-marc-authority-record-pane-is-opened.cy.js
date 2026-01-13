import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const headerText = /Create a new .*MARC authority record/;
      const defaultLDRValuesInFields = [
        ['records[0].content.Record length', '00000', true],
        ['records[0].content.7-16 positions', '\\\\a2200000', true],
        ['records[0].content.19-23 positions', '\\4500', true],
      ];
      const defaultLDRValuesInDropdowns = [
        ['LDR', 'Status', 'n - New'],
        ['LDR', 'Type', 'z - Authority data'],
        ['LDR', 'ELvl', 'o - Incomplete authority record'],
        ['LDR', 'Punct', '\\ - No information provided'],
      ];
      const users = {};

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
      });

      it(
        'C736767 "Create a new MARC authority record" pane is opened after clicking on "+ New" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C736767'] },
        () => {
          // 1 Click on "Actions" button in second pane
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.checkAuthorityActionsDropDownExpanded();
          MarcAuthorities.checkButtonNewExistsInActionDropdown();

          // 2 Select "+ New" option in expanded "Actions" menu
          MarcAuthorities.clickNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          QuickMarcEditor.checkRecordStatusNew();
          QuickMarcEditor.checkDefaultFieldsInOrder();
          MarcAuthority.checkSourceFileSelectShown();

          // 3 Check "LDR" field
          defaultLDRValuesInFields.forEach((defaultLDRValueInField) => {
            QuickMarcEditor.verifyLDRPositionsDefaultValues(...defaultLDRValueInField);
          });
          defaultLDRValuesInDropdowns.forEach((defaultLDRValueInDropdown) => {
            QuickMarcEditor.verifyDropdownOptionChecked(...defaultLDRValueInDropdown);
          });
        },
      );
    });
  });
});
