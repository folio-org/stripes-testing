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

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();
      const randomTwoDigits = randomNDigitNumber(2);
      const tag001 = '001';
      const tag008 = '008';
      const tag010 = '010';
      const tag130 = '130';
      const sourceAccordionName = 'Authority source';
      const headerText = /New .*MARC authority record/;
      const authorityHeading = `AT_C423534_MarcAuthority_${randomPostfix}`;
      const field130 = {
        tag: tag130,
        content: `$a ${authorityHeading}`,
      };
      const field010Content = `$a 423534${randomTwoDigits} $z 423534${randomTwoDigits}${randomTwoDigits}`;
      const field010ContentAfterSave = `$a    423534${randomTwoDigits}  $z   423534${randomTwoDigits}${randomTwoDigits}`;
      const localAuthFile = {
        name: `AT_C423534_AuthoritySourceFile_${randomPostfix}`,
        prefix: `${getRandomLetters(22)}d`,
        startWithNumber: '1',
        isActive: true,
      };
      const users = {};
      let createdAuthorityId;

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423534_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C423534_*').then(() => {
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
            // ensure LCCN structure validation is disabled (this is the default state)
            MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: false });
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
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C423534 Create a new MARC authority record with invalid prefix ("Local" authority file and "LCCN" field without prefix) when "LCCN structure validation" is disabled (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423534'] },
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

          // Step 4: Add 130 field
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, field130.tag, field130.content);
          QuickMarcEditor.checkContentByTag(field130.tag, field130.content);

          // Step 5: Add 010 field without LCCN prefix (invalid, allowed since validation is disabled)
          MarcAuthority.addNewFieldAfterExistingByTag(tag130, tag010, field010Content);
          QuickMarcEditor.checkContentByTag(tag010, field010Content);

          // Step 6: Save & close; verify 001 and 010 padded format in detail view
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyCreatedRecordSuccess();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(headerText);
          MarcAuthorities.verifyViewPaneContentExists();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;

            MarcAuthority.contains(tag001);
            MarcAuthority.contains(`${localAuthFile.prefix}${localAuthFile.startWithNumber}`);
            MarcAuthority.contains(field010ContentAfterSave);

            // Step 7: Close detail view pane
            MarcAuthorities.closeMarcViewPane();
            MarcAuthorities.verifyMarcViewPaneIsOpened(false);
            MarcAuthorities.waitLoading();
            MarcAuthorities.checkRecordsResultListIsAbsent();

            // Step 8: Search by 130 heading; verify record found
            MarcAuthorities.searchBeats(authorityHeading);
            MarcAuthorities.verifyRecordFound(authorityHeading);
            MarcAuthorities.selectAuthorityById(createdAuthorityId);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityHeading);

            // Step 9: Filter by local authority file; verify record found
            MarcAuthorities.clickMultiSelectToggleButtonInAccordion(sourceAccordionName);
            MarcAuthorities.chooseAuthoritySourceOption(localAuthFile.name);
            MarcAuthorities.checkSelectedAuthoritySource(localAuthFile.name);
            MarcAuthorities.verifyRecordFound(authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityHeading);
          });
        },
      );
    });
  });
});
