import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

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
        cy.resetTenant();
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.marcValue);

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

            ManageAuthorityFiles.setAllDefaultFOLIOFilesToActiveViaAPI();
          })
          .then(() => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            }, 20_000);
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(testData.authorityId);
        ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
        cy.deleteAuthoritySourceFileViaAPI(testData.authSourceID, true);
      });

      it(
        'C423572 Create a new shared MARC authority record with "Local" authority file selected at Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C423572'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();
          MarcAuthority.selectSourceFile(testData.sourceName);
          QuickMarcEditor.checkContentByTag('001', `${testData.prefix}${testData.startWithNumber}`);
          MarcAuthority.addNewField(3, newField.tag, newField.content);
          QuickMarcEditor.pressSaveAndCloseButton();
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
          MarcAuthorities.selectTitle(`${testData.sharedIcon}\n${testData.marcValue}`);
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
