import Permissions from '../../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../../support/dictionary/affiliations';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create', () => {
      describe('Consortia', () => {
        const headerText = 'New shared MARC authority record';
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
        const userPermissionsMember = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
        ];
        const user = {};

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.createTempUser(userPermissionsMember).then((userProperties) => {
            user.userProperties = userProperties;

            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userProperties.userId);
        });

        it(
          'C423414 "New shared MARC authority record" pane is opened after clicking on "+ New" option at Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C423414'] },
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
});
