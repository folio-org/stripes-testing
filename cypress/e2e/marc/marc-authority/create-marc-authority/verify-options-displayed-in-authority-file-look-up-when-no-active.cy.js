import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const users = {};
      const randomPostfix = getRandomPostfix();
      const paneHeaderCreateNewSharedMarcAuthorityRecord = 'Create a new MARC authority record';
      const localAuthFile = {
        name: `C422245 auth source file ${randomPostfix}`,
        prefix: getRandomLetters(8),
        startWithNumber: '1',
        isActive: false,
      };

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
            cy.createAuthoritySourceFileUsingAPI(
              localAuthFile.prefix,
              localAuthFile.startWithNumber,
              localAuthFile.name,
              localAuthFile.isActive,
            ).then((sourceId) => {
              localAuthFile.fileId = sourceId;
            });
          })
          .then(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.fileId);
      });

      it(
        `C656275 Verify options displayed in "Authority file look-up" modal in "Create a new MARC authority record"
         window when no one have the "Active" checkbox selected in the settings (spitfire)`,
        { tags: ['criticalPath', 'spitfire', 'C656275'] },
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
          QuickMarcEditor.verifyOptionInAuthorityFileNameDropdown(
            'Select authority file (disabled)',
          );
          QuickMarcEditor.verifyOptionInAuthorityFileNameDropdown(
            localAuthFile.name,
            localAuthFile.isActive,
          );
          Object.values(DEFAULT_FOLIO_AUTHORITY_FILES).forEach((defaultFOLIOAuthorityFile) => {
            QuickMarcEditor.verifyOptionInAuthorityFileNameDropdown(
              defaultFOLIOAuthorityFile,
              false,
            );
          });
        },
      );
    });
  });
});
