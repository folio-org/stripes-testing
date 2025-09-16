import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const users = {};
      const localAuthFilesIds = [];
      const randomPostfix = getRandomPostfix();
      const paneHeaderCreateNewMarcAuthorityRecord = /Create a new .*MARC authority record/;
      const localAuthFiles = [
        {
          name: `C422243 auth source file active ${randomPostfix}`,
          prefix: getRandomLetters(8),
          startWithNumber: '1',
          isActive: true,
        },
        {
          name: `C422243 auth source file ${randomPostfix}`,
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
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
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
        `C422243 Verify options displayed in "Select authority file" dropdown in "Create a new MARC authority record" window 
        when only one LOCAL has the "Active" checkbox selected in the settings (spitfire)`,
        { tags: ['criticalPath', 'spitfire', 'C422243'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(paneHeaderCreateNewMarcAuthorityRecord);
          MarcAuthority.checkSourceFileSelectShown();
          localAuthFiles.forEach((localAuthFile) => {
            MarcAuthority.verifySourceFileOptionPresent(localAuthFile.name, localAuthFile.isActive);
          });
        },
      );
    });
  });
});
