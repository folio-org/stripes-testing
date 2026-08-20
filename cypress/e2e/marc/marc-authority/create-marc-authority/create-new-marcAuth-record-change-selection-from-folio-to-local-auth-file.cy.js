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
      // FOLIO file selected first; no special prefix needed for 010
      const folioAuthFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      // naturalId has no FOLIO prefix — plain numeric identifier
      const naturalId = `${randomNDigitNumber(15)}423552`;
      const field010Content = `$a ${naturalId}`;
      const authorityHeading = `AT_C423552_MarcAuthority_${randomPostfix}`;
      const localAuthFile = {
        name: `AT_C423552_AuthoritySourceFile_${randomPostfix}`,
        prefix: `${getRandomLetters(20)}h`,
        startWithNumber: '1',
        isActive: true,
      };
      const users = {};
      let createdAuthorityId;

      before('Create user, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423552_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C423552_*').then(() => {
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
            cy.wait(70_000); // wait for created source file to be processed by scheduled job
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
        'C423552 Change selection of authority file from "FOLIO" to "Local" and create a new MARC authority record (promin)',
        { tags: ['extendedPath', 'promin', 'nonParallel', 'C423552'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();

          // Step 2: Set valid 008 dropdown values
          MarcAuthority.setValid008DropdownValues();

          // Step 3: Add 010 field with no-prefix identifier (before selecting any authority file)
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, field010Content);
          QuickMarcEditor.checkContentByTag(tag010, field010Content);

          // Step 4: Select FOLIO authority file
          MarcAuthority.selectSourceFile(folioAuthFile);
          MarcAuthority.verifySourceFileSelected(folioAuthFile);

          // Step 5: Add 100 heading field
          MarcAuthority.addNewFieldAfterExistingByTag(tag010, tag100, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag100, `$a ${authorityHeading}`);

          // Step 6: Switch to Local authority file; 001 auto-populated with local prefix + HRID
          MarcAuthority.selectSourceFile(localAuthFile.name);
          QuickMarcEditor.checkFourthBoxEditable(tag001RowIndex, false);
          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
          );

          // Step 7: Save & close; verify 001 has local prefix and 010 has plain naturalId
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;
            MarcAuthority.checkTagInRow(
              tag001RowIndex,
              `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
            );
            MarcAuthority.checkTagInRow(tag010RowIndex, naturalId);
          });
        },
      );
    });
  });
});
