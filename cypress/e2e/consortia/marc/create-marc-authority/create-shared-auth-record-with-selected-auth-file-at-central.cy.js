import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
// TODO: uncomment after functionality will be added
// import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const testData = {
        sourceName: `Test auth source file ${getRandomPostfix()}`,
        prefix: getRandomLetters(8),
        startWithNumber: '1',
        searchOption: 'Keyword',
        marcValue: 'Create a new Shared MARC authority record with Local authority file test',
        headerText: 'Create a new shared MARC authority record',
        AUTHORIZED: 'Authorized',
        sharedIcon: 'Shared',
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
            cy.createAuthoritySourceFileUsingAPI(
              testData.prefix,
              testData.startWithNumber,
              testData.sourceName,
            ).then((sourceId) => {
              testData.authSourceID = sourceId;
            });
            // TODO: uncomment after functionality will be added
            // ManageAuthorityFiles.setAllDefaultFOLIOFilesToActive();
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
        MarcAuthority.deleteViaAPI(testData.authorityId);
        // TODO: uncomment after functionality will be added
        // ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActive();
        cy.deleteAuthoritySourceFileViaAPI(testData.authSourceID);
      });

      it(
        'C423572 Create a new shared MARC authority record with "Local" authority file selected at Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          MarcAuthorities.clickNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);
          QuickMarcEditor.verifyAuthorityLookUpButton();
          QuickMarcEditor.clickAuthorityLookUpButton();
          QuickMarcEditor.selectAuthorityFile(testData.sourceName);
          QuickMarcEditor.verifyAuthorityFileSelected(testData.sourceName);
          QuickMarcEditor.clickSaveAndCloseInModal();
          QuickMarcEditor.checkContentByTag('001', `${testData.prefix}${testData.startWithNumber}`);
          MarcAuthority.addNewField(4, newField.tag, newField.content);
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyAfterSaveAndClose();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(testData.headerText);
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.marcValue);
          MarcAuthority.getId().then((id) => {
            testData.authorityId = id;
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBy(testData.searchOption, testData.marcValue);
          MarcAuthorities.checkAfterSearch(
            testData.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValue}`,
          );
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.marcValue);

          MarcAuthorities.chooseAuthoritySourceOption(testData.sourceName);
          MarcAuthorities.checkResultsSelectedByAuthoritySource([testData.sourceName]);
          MarcAuthorities.selectTitle(testData.marcValue);
          MarcAuthorities.checkAfterSearch(
            testData.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValue}`,
          );
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.marcValue);
        },
      );
    });
  });
});
