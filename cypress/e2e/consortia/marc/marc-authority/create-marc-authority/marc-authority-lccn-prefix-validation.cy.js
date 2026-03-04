import Permissions from '../../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import ManageAuthorityFiles from '../../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const errorInvalidLccn = '010 $a is in an invalid format.';
        const localAuthorityFileName = `AT_C569537_AuthSourceFile_${randomPostfix}`;
        const tag100 = '100';
        const tag010 = '010';
        const valid100FirstIndicatorValue = '1';
        const authorityHeading = `AT_C569537_MarcAuthority_${randomPostfix}`;
        const filePrefix = getRandomLetters(7);
        const fileStartWithNumber = '1';
        const invalidLccnValues = [
          '569537026812', // 12 digits
          '56953702681', // 11 digits
          '569537026', // 9 digits
          '5695370', // 7 digits
          '5', // 1 digit
        ];
        const validLccnValue = '56953755'; // 8 digits
        let userProperties;

        after('Delete user, data, reset setting', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: false });
          ManageAuthorityFiles.deleteAuthoritySourceFileByNameViaApi(localAuthorityFileName);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569537_');
          Users.deleteViaApi(userProperties.userId);
        });

        it(
          'C569537 Cannot create MARC authority record without prefix in LCCN when LCCN structure validation is enabled (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'C569537', 'nonParallel', 'spitfire'] },
          () => {
            cy.then(() => {
              // Precondition moved in `it` block to ensure `after` hook is always triggered
              cy.resetTenant();
              cy.getAdminToken();
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569537_');
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
              ]).then((createdUser) => {
                userProperties = createdUser;

                // Create a local authority file
                cy.createAuthoritySourceFileUsingAPI(
                  filePrefix,
                  fileStartWithNumber,
                  localAuthorityFileName,
                ).then(() => {
                  MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: true });

                  ManageAuthorityFiles.setAuthorityFileToActiveViaApi(localAuthorityFileName);
                  cy.resetTenant();
                  cy.login(userProperties.username, userProperties.password, {
                    path: TopMenu.marcAuthorities,
                    waiter: MarcAuthorities.waitLoading,
                  });
                });
              });
            }).then(() => {
              // Step 1: Open new authority record pane
              MarcAuthorities.clickActionsAndNewAuthorityButton();
              QuickMarcEditor.checkRecordStatusNew();
              MarcAuthority.setValid008DropdownValues();

              // Step 2: Select local authority file
              MarcAuthority.checkSourceFileSelectShown();
              MarcAuthority.selectSourceFile(localAuthorityFileName);

              // Step 3: Add 100 field
              QuickMarcEditor.addNewField(tag100, `$a ${authorityHeading}`, 3);
              QuickMarcEditor.checkContent(`$a ${authorityHeading}`, 4);
              QuickMarcEditor.updateIndicatorValue(tag100, valid100FirstIndicatorValue, 0);

              // Step 4: Add 010 field
              QuickMarcEditor.addNewField(tag010, '', 4);
              QuickMarcEditor.checkContent('', 5);

              invalidLccnValues.forEach((lccn) => {
                QuickMarcEditor.updateExistingFieldContent(5, `$a ${lccn}`);
                QuickMarcEditor.checkContent(`$a ${lccn}`, 5);
                QuickMarcEditor.pressSaveAndCloseButton();
                QuickMarcEditor.checkErrorMessage(5, errorInvalidLccn);
                QuickMarcEditor.closeAllCallouts();
              });

              // Step 9: Add valid 8-digit LCCN (should save successfully)
              QuickMarcEditor.updateExistingFieldContent(5, `$a ${validLccnValue}`);
              QuickMarcEditor.checkContent(`$a ${validLccnValue}`, 5);
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndCloseAuthority();
              MarcAuthority.contains(`   ${validLccnValue} `);
            });
          },
        );
      });
    });
  });
});
