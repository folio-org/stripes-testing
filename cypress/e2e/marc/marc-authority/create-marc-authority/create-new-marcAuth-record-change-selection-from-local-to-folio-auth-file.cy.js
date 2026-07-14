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
      const tag001RowIndex = 1;
      const tag010RowIndex = 4;
      const headerText = MarcAuthority.createAuthorityPaneTitleRegExp;
      const folioAuthFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_GENRE_FORM_TERMS;
      const naturalId = `gf423549${randomNDigitNumber(15)}`;
      const field010Content = `$a ${naturalId}`;
      const authorityHeading = `AT_C423549_MarcAuthority_${randomPostfix}`;
      const errorMessage = 'Record cannot be saved without 010 field.';
      const localAuthFile = {
        name: `AT_C423549_AuthoritySourceFile_${randomPostfix}`,
        prefix: `${getRandomLetters(20)}h`,
        startWithNumber: '1',
        isActive: true,
      };
      const users = {};
      let createdAuthorityId;

      before('Create user, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423549_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C423549_*').then(() => {
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
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthFile);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C423549 Change selection of authority file from "Local" to "FOLIO" and create a new MARC authority record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C423549'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();

          // Step 2: Set valid 008 dropdown values
          MarcAuthority.setValid008DropdownValues();

          // Step 3: Add 100 heading field
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag100, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag100, `$a ${authorityHeading}`);

          // Step 4: Select local authority file; verify 001 updated with local prefix
          MarcAuthority.selectSourceFile(localAuthFile.name);
          QuickMarcEditor.checkFourthBoxEditable(tag001RowIndex, false);
          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
          );

          // Step 5: Re-select same local authority file; verify still selected
          MarcAuthority.selectSourceFile(localAuthFile.name);

          // Step 6: Switch to FOLIO authority file; verify 001 cleared
          MarcAuthority.selectSourceFile(folioAuthFile);
          QuickMarcEditor.checkContentByTag(tag001, '');

          // Step 7: Save & close without 010; verify error callout and form remains open
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(errorMessage);
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains(headerText);

          // Step 8: Add 010 field with FOLIO authority file prefix
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, field010Content);
          QuickMarcEditor.checkContentByTag(tag010, field010Content);

          // Step 9: Save & close; verify record created with matching 001 and 010 values
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;

            MarcAuthority.checkTagInRow(tag001RowIndex, naturalId);
            MarcAuthority.checkTagInRow(tag010RowIndex, naturalId);
          });
        },
      );
    });
  });
});
