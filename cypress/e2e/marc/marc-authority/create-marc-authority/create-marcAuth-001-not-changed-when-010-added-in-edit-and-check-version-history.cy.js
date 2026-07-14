import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import DateTools from '../../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();
      const tagLdr = 'LDR';
      const tag001 = '001';
      const tag008 = '008';
      const tag010 = '010';
      const tag150 = '150';
      const headerText = /New .*MARC authority record/;
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const ldrRegExp = /\d{5}[a-zA-Z]{2}.{2}[a-zA-Z0-9]{9}.{2}4500/;
      const authorityHeading = `AT_C423538_MarcAuthority_${randomPostfix}`;
      const tag010Content = `$a n${randomNDigitNumber(15)}423538`;
      const tag010ContentInModal = `   ${tag010Content}`;
      const localAuthFile = {
        name: `AT_C423538_AuthoritySourceFile_${randomPostfix}`,
        prefix: `${getRandomLetters(22)}e`,
        startWithNumber: '1',
        isActive: true,
      };
      const users = {};
      let createdAuthorityId;

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423538_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C423538_*').then(() => {
          Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
            cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
          });
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
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
            ManageAuthorityFiles.setAllDefaultFOLIOFilesToActiveViaAPI();
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
        ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C423538 Generated "001" field of created MARC authority record doesn\'t change when "010" field is added from edit window and check "Version history" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C423538'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();

          // Step 2: Select local authority file
          MarcAuthority.verifySourceFileOptionPresent(localAuthFile.name);
          MarcAuthority.selectSourceFile(localAuthFile.name);

          QuickMarcEditor.checkFourthBoxEditable(1, false);
          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
          );

          // Step 4: Add 150 field
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag150, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag150, `$a ${authorityHeading}`);

          // Step 5: Save & close; verify detail view
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyCreatedRecordSuccess();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(headerText);
          MarcAuthorities.verifyViewPaneContentExists();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;

            MarcAuthority.contains(tag001);
            MarcAuthority.contains(`${localAuthFile.prefix}${localAuthFile.startWithNumber}`);

            // Step 6: Open edit mode
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            // Step 7: Add 010 field
            MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, tag010Content);
            QuickMarcEditor.checkContentByTag(tag010, tag010Content);

            // Step 8: Save & close; verify 001 not changed by added 010
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.verifyAfterSaveAndClose();
            MarcAuthority.contains(tag001);
            MarcAuthority.contains(`${localAuthFile.prefix}${localAuthFile.startWithNumber}`);

            // Step 9: Open Version History; verify 2 cards
            MarcAuthority.clickVersionHistoryButton();
            VersionHistorySection.waitLoading();
            VersionHistorySection.verifyVersionHistoryPane(2);

            VersionHistorySection.verifyVersionHistoryCard(
              0,
              date,
              users.userProperties.firstName,
              users.userProperties.lastName,
              false,
              true,
            );
            VersionHistorySection.checkChangeForCard(
              0,
              `Field ${tag010}`,
              VersionHistorySection.fieldActions.ADDED,
            );
            VersionHistorySection.checkChangeForCard(
              0,
              `Field ${tagLdr}`,
              VersionHistorySection.fieldActions.EDITED,
            );
            VersionHistorySection.verifyVersionHistoryCard(
              1,
              date,
              users.userProperties.firstName,
              users.userProperties.lastName,
              true,
              false,
            );

            // Step 10: Open changes modal for current version card; verify 010 Added and LDR Edited
            VersionHistorySection.openChangesForCard(0);
            VersionHistorySection.verifyChangesModal(
              date,
              users.userProperties.firstName,
              users.userProperties.lastName,
            );
            VersionHistorySection.checkChangeInModal(
              VersionHistorySection.fieldActions.ADDED,
              tag010,
              undefined,
              tag010ContentInModal,
            );
            VersionHistorySection.checkChangeInModal(
              VersionHistorySection.fieldActions.EDITED,
              tagLdr,
              ldrRegExp,
              ldrRegExp,
            );
            VersionHistorySection.checkChangesCountInModal(2);
            VersionHistorySection.closeChangesModal();
          });
        },
      );
    });
  });
});
