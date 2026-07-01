import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();
      const tag001 = '001';
      const tag008 = '008';
      const tag010 = '010';
      const tag100 = '100';
      const tag010RowIndex = 4;
      const headerText = MarcAuthority.createAuthorityPaneTitleRegExp;
      const folioAuthFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const tag010Content = `$a 423541${randomNDigitNumber(15)}`;
      const authorityHeading = `AT_C423541_MarcAuthority_${randomPostfix}`;
      const errorMessage = 'Record cannot be saved without a prefix in the 010 field.';
      const users = {};

      before('Create user, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423541_');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
            ManageAuthorityFiles.setAuthorityFileToActiveViaApi(folioAuthFile);
          })
          .then(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthFile);
        Users.deleteViaApi(users.userProperties.userId);
      });

      it(
        'C423541 Create a new MARC authority record with "FOLIO" authority file selected and added "010" field without prefix (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C423541'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();

          // Step 2: Select FOLIO authority file
          MarcAuthority.selectSourceFile(folioAuthFile);
          QuickMarcEditor.checkContentByTag(tag001, '');

          // Step 4: Add 010 field without prefix and 100 heading field
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, tag010Content);
          QuickMarcEditor.checkContentByTag(tag010, tag010Content);

          MarcAuthority.addNewFieldAfterExistingByTag(tag010, tag100, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag100, `$a ${authorityHeading}`);

          // Step 5: Save & close; verify inline error on 010 row and form remains open
          cy.intercept('POST', '/records-editor/validate').as('validateRequest');
          QuickMarcEditor.pressSaveAndCloseButton();
          cy.wait('@validateRequest', { timeout: 10_000 })
            .its('response.statusCode')
            .should('eq', 200);
          MarcAuthority.verifySourceFileSelected(folioAuthFile);
          QuickMarcEditor.verifyValidationCallout();
          QuickMarcEditor.checkErrorMessage(tag010RowIndex, errorMessage);
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains(headerText);
        },
      );
    });
  });
});
