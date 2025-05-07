import Permissions from '../../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../../support/constants';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const users = {};
      const localAuthFilesIds = [];
      const randomPostfix = getRandomPostfix();
      const paneHeaderCreateNewSharedMarcAuthorityRecord = 'New shared MARC authority record';
      const localAuthFiles = [
        {
          name: `C422248 auth source file active ${randomPostfix}`,
          prefix: getRandomLetters(8),
          startWithNumber: '1',
          isActive: true,
        },
        {
          name: `C422248 auth source file ${randomPostfix}`,
          prefix: getRandomLetters(8),
          startWithNumber: '2',
          isActive: false,
        },
      ];

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
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
            Object.values(DEFAULT_FOLIO_AUTHORITY_FILES)
              .slice(0, 2)
              .forEach((defaultFileName) => {
                ManageAuthorityFiles.setAuthorityFileToActiveViaApi(defaultFileName);
              });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        Users.deleteViaApi(users.userProperties.userId);
        localAuthFilesIds.forEach((localAuthFileId) => {
          cy.deleteAuthoritySourceFileViaAPI(localAuthFileId);
        });
        Object.values(DEFAULT_FOLIO_AUTHORITY_FILES)
          .slice(0, 2)
          .forEach((defaultFileName) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(defaultFileName);
          });
      });

      it(
        'C422248 Verify options displayed in "Authority file look-up" modal from Central tenant when some authority files (FOLIO and LOCAL) have the "Active" checkbox selected in the settings (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C422248'] },
        () => {
          // Click on "Actions" button in second pane >> Select "+ New" option
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(paneHeaderCreateNewSharedMarcAuthorityRecord);
          MarcAuthority.checkSourceFileSelectShown();

          Object.values(DEFAULT_FOLIO_AUTHORITY_FILES)
            .slice(0, 2)
            .forEach((defaulFOLIOAuthorityFile) => {
              MarcAuthority.verifySourceFileOptionPresent(defaulFOLIOAuthorityFile);
            });

          localAuthFiles.forEach((localAuthFile) => {
            MarcAuthority.verifySourceFileOptionPresent(localAuthFile.name, localAuthFile.isActive);
          });

          // Select any option from the expanded dropdown
          MarcAuthority.selectSourceFile(localAuthFiles[0].name);

          QuickMarcEditor.checkPaneheaderContains(paneHeaderCreateNewSharedMarcAuthorityRecord);
        },
      );
    });
  });
});
