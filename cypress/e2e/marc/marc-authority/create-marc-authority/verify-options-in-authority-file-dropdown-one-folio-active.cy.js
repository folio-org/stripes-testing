import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const users = {};
      const randomPostfix = getRandomPostfix();
      const paneHeaderCreateNewSharedMarcAuthorityRecord = 'Create a new MARC authority record';
      const localAuthFile = {
        name: `C422244 auth source file ${randomPostfix}`,
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
            ManageAuthorityFiles.setAuthorityFileToActiveViaApi(
              DEFAULT_FOLIO_AUTHORITY_FILES.LC_DEMOGRAPHIC_GROUP_TERMS,
            );
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            }, 20_000);
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.fileId);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(
          DEFAULT_FOLIO_AUTHORITY_FILES.LC_DEMOGRAPHIC_GROUP_TERMS,
        );
      });

      it(
        `C422244 Verify options displayed in "Select authority file" dropdown in "Create a new MARC authority record" window 
        when only one FOLIO has the "Active" checkbox selected in the settings (spitfire)`,
        { tags: ['criticalPath', 'spitfire', 'C422244'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(paneHeaderCreateNewSharedMarcAuthorityRecord);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.verifySourceFileOptionPresent(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_DEMOGRAPHIC_GROUP_TERMS,
          );
          MarcAuthority.verifySourceFileOptionPresent(localAuthFile.name, localAuthFile.isActive);
        },
      );
    });
  });
});
