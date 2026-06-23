import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomPostfix = getRandomPostfix();
      const paneHeaderCreateNewMarcAuthorityRecord = /New .*MARC authority record/;
      const localAuthFile = {
        name: `AT_C422241_AuthoritySourceFile_${randomPostfix}`,
        prefix: getRandomLetters(22),
        startWithNumber: '1',
        isActive: true,
      };
      const users = {};
      let localAuthFileId;

      before('Create user, data', () => {
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
              localAuthFileId = sourceId;
              ManageAuthorityFiles.setAuthorityFileToActiveViaApi(localAuthFile.name);
            });
            Object.values(DEFAULT_FOLIO_AUTHORITY_FILES).forEach((defaultFileName) => {
              ManageAuthorityFiles.setAuthorityFileToActiveViaApi(defaultFileName);
            });
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
        Object.values(DEFAULT_FOLIO_AUTHORITY_FILES).forEach((defaultFileName) => {
          ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(defaultFileName);
        });
        Users.deleteViaApi(users.userProperties.userId);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFileId, true);
      });

      it(
        'C422241 Verify options displayed in "Select authority file" dropdown in "Create a new MARC authority record" window when all authority files (FOLIO and LOCAL) have the "Active" checkbox selected in the settings (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C422241'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(paneHeaderCreateNewMarcAuthorityRecord);
          MarcAuthority.checkSourceFileSelectShown();

          Object.values(DEFAULT_FOLIO_AUTHORITY_FILES).forEach((defaultFileName) => {
            MarcAuthority.verifySourceFileOptionPresent(defaultFileName);
          });
          MarcAuthority.verifySourceFileOptionPresent(localAuthFile.name);

          MarcAuthority.selectSourceFile(localAuthFile.name);
        },
      );
    });
  });
});
