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
      const defaultFileNaturalId = `n423533${randomNDigitNumber(18)}`;
      const headerText = /New .*MARC authority record/;
      const sourceAccordionName = 'Authority source';
      const authorityHeading = `AT_C423533_MarcAuthority_${randomPostfix}`;
      const folioAuthFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const field111 = {
        previousFieldTag: '010',
        tag: '111',
        content: `$a ${authorityHeading}`,
      };
      const localAuthFile = {
        name: `AT_C423533_AuthoritySourceFile_${randomPostfix}`,
        prefix: `${getRandomLetters(22)}c`,
        startWithNumber: '1',
        isActive: true,
      };
      const users = {};
      let createdAuthorityId;

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423533_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C423533_*').then(() => {
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
            cy.wait(70_000); // wait for new source file to be processed
            cy.getAdminToken();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthFile);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C423533 Create a new MARC authority record with "Local" authority file selected and added "010" field with prefix of different "FOLIO" authority file (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423533'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();

          // Step 2: Select local authority file; verify 001 updated
          MarcAuthority.verifySourceFileOptionPresent(localAuthFile.name);
          MarcAuthority.selectSourceFile(localAuthFile.name);

          QuickMarcEditor.checkFourthBoxEditable(1, false);
          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
          );

          // Step 4: Add 010 field with FOLIO authority file prefix
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, `$a ${defaultFileNaturalId}`);
          QuickMarcEditor.checkContentByTag(tag010, `$a ${defaultFileNaturalId}`);

          // Step 5: Add 111 field
          MarcAuthority.addNewFieldAfterExistingByTag(
            field111.previousFieldTag,
            field111.tag,
            field111.content,
          );
          QuickMarcEditor.checkContentByTag(field111.tag, field111.content);

          // Step 6: Save & close; verify detail view with correct 001 value
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyCreatedRecordSuccess();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(headerText);
          MarcAuthorities.verifyViewPaneContentExists();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;

            MarcAuthority.contains(tag001);
            MarcAuthority.contains(`${localAuthFile.prefix}${localAuthFile.startWithNumber}`);

            // Step 7: Close detail view pane
            MarcAuthorities.closeMarcViewPane();
            MarcAuthorities.verifyMarcViewPaneIsOpened(false);
            MarcAuthorities.waitLoading();
            MarcAuthorities.checkRecordsResultListIsAbsent();

            // Step 8: Search by 111 heading; verify record found
            MarcAuthorities.searchBeats(authorityHeading);
            MarcAuthorities.verifyRecordFound(authorityHeading);
            MarcAuthorities.selectAuthorityById(createdAuthorityId);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityHeading);

            // Step 9: Filter by FOLIO authority file; verify record found
            MarcAuthorities.clickMultiSelectToggleButtonInAccordion(sourceAccordionName);
            MarcAuthorities.checkAuthoritySourceDropdownHasOption(folioAuthFile);
            MarcAuthorities.chooseAuthoritySourceOption(folioAuthFile);
            MarcAuthorities.checkSelectedAuthoritySource(folioAuthFile);
            MarcAuthorities.verifyRecordFound(authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityHeading);
          });
        },
      );
    });
  });
});
