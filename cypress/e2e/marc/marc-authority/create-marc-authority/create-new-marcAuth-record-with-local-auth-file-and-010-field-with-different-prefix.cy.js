import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();
      const tag001 = '001';
      const headerText = /New .*MARC authority record/;
      const authorityHeading = `AT_C423531_MarcAuthority_${randomPostfix}`;
      const field110 = {
        previousFieldTag: '008',
        tag: '110',
        content: `$a ${authorityHeading}`,
      };
      const localAuthFile1 = {
        name: `AT_C423531_AuthoritySourceFile1_${randomPostfix}`,
        prefix: `${getRandomLetters(22)}a`,
        startWithNumber: '1',
        isActive: true,
      };
      const localAuthFile2 = {
        name: `AT_C423531_AuthoritySourceFile2_${randomPostfix}`,
        prefix: `${getRandomLetters(22)}b`,
        startWithNumber: '1',
        isActive: true,
      };
      const users = {};
      let createdAuthorityId;

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423531_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C423531_*').then(() => {
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
              localAuthFile1.prefix,
              localAuthFile1.startWithNumber,
              localAuthFile1.name,
              localAuthFile1.isActive,
            ).then((sourceId) => {
              localAuthFile1.id = sourceId;
            });
            cy.createAuthoritySourceFileUsingAPI(
              localAuthFile2.prefix,
              localAuthFile2.startWithNumber,
              localAuthFile2.name,
              localAuthFile2.isActive,
            ).then((sourceId) => {
              localAuthFile2.id = sourceId;
            });
          })
          .then(() => {
            cy.wait(70_000); // wait for new source files to be processed
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
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile1.id, true);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile2.id, true);
      });

      it(
        'C423531 Create a new MARC authority record with "Local" authority file selected and added "010" field with prefix of different "Local" authority file (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423531'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();

          // Step 2: Select first local authority file; verify 001 updated
          MarcAuthority.verifySourceFileOptionPresent(localAuthFile1.name);
          MarcAuthority.verifySourceFileOptionPresent(localAuthFile2.name);
          MarcAuthority.selectSourceFile(localAuthFile1.name);

          QuickMarcEditor.checkFourthBoxEditable(1, false);
          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile1.prefix}${localAuthFile1.startWithNumber}`,
          );

          // Step 4: Add 110 field
          MarcAuthority.addNewFieldAfterExistingByTag(
            field110.previousFieldTag,
            field110.tag,
            field110.content,
          );
          QuickMarcEditor.checkContentByTag(field110.tag, field110.content);

          // Step 5: Add 010 field with second auth file prefix
          MarcAuthority.addNewFieldAfterExistingByTag(
            field110.tag,
            '010',
            `$a ${localAuthFile2.prefix}00001`,
          );
          QuickMarcEditor.checkContentByTag('010', `$a ${localAuthFile2.prefix}00001`);

          // Step 6: Save & close; verify detail view with correct 001 value
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyCreatedRecordSuccess();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(headerText);
          MarcAuthorities.verifyViewPaneContentExists();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;

            MarcAuthority.contains(tag001);
            MarcAuthority.contains(`${localAuthFile1.prefix}${localAuthFile1.startWithNumber}`);

            // Step 7: Close detail view pane
            MarcAuthorities.closeMarcViewPane();
            MarcAuthorities.verifyMarcViewPaneIsOpened(false);
            MarcAuthorities.waitLoading();
            MarcAuthorities.checkRecordsResultListIsAbsent();

            // Step 8: Open Authority source dropdown; second file present, first absent
            MarcAuthorities.clickMultiSelectToggleButtonInAccordion('Authority source');
            MarcAuthorities.checkAuthoritySourceDropdownHasOption(localAuthFile2.name);
            MarcAuthorities.checkAuthoritySourceDropdownHasOption(localAuthFile1.name, false);

            // Step 9: Filter by second auth file; verify created record found
            MarcAuthorities.chooseAuthoritySourceOption(localAuthFile2.name);
            MarcAuthorities.checkSelectedAuthoritySource(localAuthFile2.name);
            MarcAuthorities.verifyRecordFound(authorityHeading);
            MarcAuthorities.selectAuthorityById(createdAuthorityId);
            MarcAuthority.waitLoading();
          });
        },
      );
    });
  });
});
