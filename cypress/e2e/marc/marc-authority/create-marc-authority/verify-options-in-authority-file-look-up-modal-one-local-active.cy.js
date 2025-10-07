import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const users = {};
      const localAuthFilesIds = [];
      const randomPostfix = getRandomPostfix();
      const paneHeaderCreateNewSharedMarcAuthorityRecord = 'Create a new MARC authority record';
      const localAuthFiles = [
        {
          name: `C656272 auth source file active ${randomPostfix}`,
          prefix: getRandomLetters(8),
          startWithNumber: '1',
          isActive: true,
        },
        {
          name: `C656272 auth source file ${randomPostfix}`,
          prefix: getRandomLetters(8),
          startWithNumber: '2',
          isActive: false,
        },
      ];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            localAuthFiles.forEach((localAuthFile) => {
              cy.createAuthoritySourceFileUsingAPI(
                localAuthFile.prefix,
                localAuthFile.startWithNumber,
                localAuthFile.name,
                localAuthFile.isActive,
              ).then((sourceId) => {
                localAuthFilesIds.push(sourceId);
              });
            });
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        localAuthFilesIds.forEach((localAuthFileId) => {
          cy.deleteAuthoritySourceFileViaAPI(localAuthFileId);
        });
      });

      it(
        `C656272 Verify options displayed in "Authority file look-up" modal in "Create a new MARC authority record"
         window when only one LOCAL has the "Active" checkbox selected in the settings (spitfire)`,
        { tags: ['criticalPath', 'spitfire', 'C656272'] },
        () => {
          // 1 Click on "Actions" button in second pane >> Select "+ New" option
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(paneHeaderCreateNewSharedMarcAuthorityRecord);
          QuickMarcEditor.verifyAuthorityLookUpButton();

          // 2 Click on "Authority file look-up" hyperlink
          QuickMarcEditor.clickAuthorityLookUpButton();
          QuickMarcEditor.verifySelectAuthorityFileModalDefaultView();

          // 3 Click on the "Select authority file" placeholder in "Authority file name" dropdown
          QuickMarcEditor.clickAuthorityFileNameDropdown();
          cy.wait(1000);
          localAuthFiles.forEach((localAuthFile) => {
            QuickMarcEditor.verifyOptionInAuthorityFileNameDropdown(
              localAuthFile.name,
              localAuthFile.isActive,
            );
          });
        },
      );
    });
  });
});
