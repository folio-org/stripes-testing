import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
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
      const authorityHeading = `AT_C423546_MarcAuthority_${randomPostfix}`;
      const localAuthFile = {
        name: `AT_C423546_AuthoritySourceFile_${randomPostfix}`,
        prefix: `${getRandomLetters(15)}g`,
        startWithNumber: '1',
        isActive: true,
      };
      const field010Content = `$a ${localAuthFile.prefix}423546${randomNDigitNumber(4)}`;
      const errorMessage =
        'Record cannot be saved. Prefix in the 010 field does not match the selected authority file.';
      const users = {};

      before('Create user, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423546_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C423546_*').then(() => {
          Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
            cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
          });
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(
              localAuthFile.prefix,
              localAuthFile.startWithNumber,
              localAuthFile.name,
              localAuthFile.isActive,
            ).then((sourceId) => {
              localAuthFile.id = sourceId;
            });
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
        Users.deleteViaApi(users.userProperties.userId);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthFile);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C423546 Create a new MARC authority record with "FOLIO" authority file selected and added "010" field with prefix of different "Local" authority file (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C423546'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          // Step 3: Set valid 008 dropdown values
          MarcAuthority.setValid008DropdownValues();

          // Step 2: Select FOLIO authority file; verify 001 is empty
          MarcAuthority.selectSourceFile(folioAuthFile);
          QuickMarcEditor.checkContentByTag(tag001, '');

          // Step 4: Add 010 with local file prefix and 100 heading field
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, field010Content);
          QuickMarcEditor.checkContentByTag(tag010, field010Content);
          MarcAuthority.addNewFieldAfterExistingByTag(tag010, tag100, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag100, `$a ${authorityHeading}`);

          // Step 5: Save & close; verify inline error and form remains open
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(tag010RowIndex, errorMessage);
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains(headerText);
        },
      );
    });
  });
});
