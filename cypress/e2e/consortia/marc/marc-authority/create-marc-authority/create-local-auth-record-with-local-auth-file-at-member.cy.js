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
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          marcValue: `AT_C423583_MarcAuthority_${randomPostfix}`,
          sourceName: `AT_C423583_AuthoritySourceFile_${randomPostfix}`,
          headerText: 'New local MARC authority record',
        };
        const sourcePrefix = `${getRandomLetters(17)}C`;
        const startWithNumber = '423583';
        const userPermissionsCentral = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];
        const userPermissionsMember = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
        ];
        const user = {};

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423583_');
          cy.createTempUser(userPermissionsMember).then((userProperties) => {
            user.userProperties = userProperties;

            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, user.userProperties.userId);
            cy.assignPermissionsToExistingUser(user.userProperties.userId, userPermissionsCentral);

            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userProperties.userId, userPermissionsMember);

            cy.resetTenant();
            cy.createAuthoritySourceFileUsingAPI(
              sourcePrefix,
              startWithNumber,
              testData.sourceName,
            ).then((sourceId) => {
              testData.authSourceId = sourceId;
              cy.wait(70_000); // waiting for the file to be processed by scheduled job
            });
            cy.getAdminToken();
            Object.values(DEFAULT_FOLIO_AUTHORITY_FILES).forEach((defaultFileName) => {
              ManageAuthorityFiles.setAuthorityFileToActiveViaApi(defaultFileName);
            });

            cy.setTenant(Affiliations.College);
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          Object.values(DEFAULT_FOLIO_AUTHORITY_FILES).forEach((defaultFileName) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(defaultFileName);
          });
          Users.deleteViaApi(user.userProperties.userId);

          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423583_');

          cy.resetTenant();
          ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(testData.sourceName);
          cy.deleteAuthoritySourceFileViaAPI(testData.authSourceId, true);
        });

        it(
          'C423583 Create a new local MARC authority record with "Local" authority file selected at Member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C423583'] },
          () => {
            // Steps 1-3: Click Actions > + New, select Local authority file, and verify 001 field, set 008 values
            MarcAuthorities.clickActionsAndNewAuthorityButton();
            QuickMarcEditor.checkPaneheaderContains(testData.headerText);
            MarcAuthority.checkSourceFileSelectShown();
            MarcAuthority.setValid008DropdownValues();

            MarcAuthority.selectSourceFile(testData.sourceName);
            QuickMarcEditor.checkContentByTag('001', `${sourcePrefix}${startWithNumber}`);

            // Step 4: Add 110 field
            QuickMarcEditor.addNewField('110', `$a ${testData.marcValue}`, 3);

            // Step 5: Save successfully
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndCloseAuthority();
            QuickMarcEditor.verifyPaneheaderWithContentAbsent(testData.headerText);
            MarcAuthority.contains(`001\t.*${sourcePrefix}${startWithNumber}`, { regexp: true });
            MarcAuthority.contains(testData.marcValue);

            // Step 6: Switch to Member 2 tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            MarcAuthorities.waitLoading();

            // Step 7: Search by 010 in Member 2 → no results
            MarcAuthorities.searchBeats(testData.marcValue);
            MarcAuthorities.verifyEmptySearchResults(testData.marcValue);

            // Step 8: Switch to Central tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
            MarcAuthorities.waitLoading();

            // Step 9: Search by 010 in Central → no results
            MarcAuthorities.searchBeats(testData.marcValue);
            MarcAuthorities.verifyEmptySearchResults(testData.marcValue);
          },
        );
      });
    });
  });
});
