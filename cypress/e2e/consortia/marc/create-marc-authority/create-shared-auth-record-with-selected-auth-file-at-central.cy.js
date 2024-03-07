import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const testData = {
        sourceName: `Test auth source file ${getRandomPostfix()}`,
        prefix: getRandomLetters(8),
        startWithNumber: '1',
      };

      const users = {};

      const newField = {
        rowIndex: 5,
        tag: '110',
        content: '$a Create a new Shared MARC authority record with Local authority file test',
      };

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            cy.createAuthoritySourceFileIdViaAPI(
              testData.prefix,
              testData.startWithNumber,
              testData.sourceName,
            ).then((sourceId) => {
              testData.authSourceID = sourceId;
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
        cy.deleteAuthoritySourceFileViaAPI(testData.authSourceID);
      });

      it(
        'C423572 Create a new shared MARC authority record with "Local" authority file selected at Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          MarcAuthorities.clickNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains('Create a new shared MARC authority record');
          QuickMarcEditor.verifyAuthorityLookUpButton();
          QuickMarcEditor.clickAuthorityLookUpButton();
          QuickMarcEditor.selectAuthorityFile(testData.sourceName);
          QuickMarcEditor.verifyAuthorityFileSelected(testData.sourceName);
          QuickMarcEditor.clickSaveAndCloseInModal();
          QuickMarcEditor.checkContentByTag('001', `${testData.prefix}${testData.startWithNumber}`);
          MarcAuthority.addNewField(4, newField.tag, newField.content);
          QuickMarcEditor.pressSaveAndClose();

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          MarcAuthorities.waitLoading();
        },
      );
    });
  });
});
