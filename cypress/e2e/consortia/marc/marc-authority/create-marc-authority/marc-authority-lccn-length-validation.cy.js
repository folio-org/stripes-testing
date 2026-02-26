import Permissions from '../../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../../support/constants';
import ManageAuthorityFiles from '../../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const errorInvalidLccn = '010 $a is in an invalid format.';
        const authorityFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
        const authorityHeading = `AT_C569534_MarcAuthority_${randomPostfix}`;
        const invalidLccnValues = [
          'noC5695349444', // 13 chars
          'n', // 1 char
          'nC5695349444', // 12 chars
          'noC56953494', // 11 chars
          'nC56953494', // 10 chars
          'nC569534', // 8 chars
          'n', // 2 chars
        ];
        let userProperties;

        after('Delete user, data, reset setting', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: false });
          ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(authorityFile);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569534_');
          Users.deleteViaApi(userProperties.userId);
        });

        it(
          'C569534 LCCN length validation on Create a new MARC authority record pane when LCCN structure validation is enabled (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'C569534', 'nonParallel', 'spitfire'] },
          () => {
            cy.then(() => {
              // Precondition moved in `it` block to ensure `after` hook is always triggered
              cy.resetTenant();
              cy.getAdminToken();
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569534_');
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
              ]).then((createdUser) => {
                userProperties = createdUser;

                MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: true });

                ManageAuthorityFiles.setAuthorityFileToActiveViaApi(authorityFile);
                cy.resetTenant();
                cy.login(userProperties.username, userProperties.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
              });
            }).then(() => {
              // Step 1: Open new authority record pane
              MarcAuthorities.clickActionsAndNewAuthorityButton();
              QuickMarcEditor.checkRecordStatusNew();

              // Step 2: Select authority file (LCNAF)
              MarcAuthority.checkSourceFileSelectShown();
              MarcAuthority.selectSourceFile(authorityFile);
              MarcAuthority.setValid008DropdownValues();

              // Step 3: Add 100 field
              QuickMarcEditor.addNewField('100', `$a ${authorityHeading}`, 3);
              QuickMarcEditor.checkContent(`$a ${authorityHeading}`, 4);

              // Step 4: Add 010 field
              QuickMarcEditor.addNewField('010', '', 4);
              QuickMarcEditor.checkContent('', 5);

              invalidLccnValues.forEach((lccn) => {
                QuickMarcEditor.updateExistingFieldContent(5, `$a ${lccn}`);
                QuickMarcEditor.checkContent(`$a ${lccn}`, 5);
                QuickMarcEditor.pressSaveAndCloseButton();
                QuickMarcEditor.checkErrorMessage(5, errorInvalidLccn);
                QuickMarcEditor.closeAllCallouts();
              });
            });
          },
        );
      });
    });
  });
});
