import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import {
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const headerText = /New .*MARC authority record/;
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
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
      });

      it(
        'C423435 "Save & close" button is disabled by default in "Create a new MARC authority record" window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423435'] },
        () => {
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.checkAuthorityActionsDropDownExpanded();
          MarcAuthorities.checkButtonNewExistsInActionDropdown();

          MarcAuthorities.clickNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          QuickMarcEditor.checkRecordStatusNew();
          QuickMarcEditor.checkDefaultFieldsInOrder();
          MarcAuthority.checkSourceFileSelectShown();

          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.selectFieldsDropdownOption(
            'LDR',
            AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.C,
          );

          QuickMarcEditor.checkButtonsEnabled();
        },
      );
    });
  });
});
