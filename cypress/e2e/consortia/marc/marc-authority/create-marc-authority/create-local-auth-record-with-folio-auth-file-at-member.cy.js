import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomPostfix = getRandomPostfix();
      const users = {};
      const testData = {
        marcValue: `AT_C423582_MarcAuthority_${randomPostfix}`,
        headerText: 'Create a new local MARC authority record',
        editHeaderText: 'Edit local MARC authority record',
        AUTHORIZED: 'Authorized',
      };
      const folioPrefix = 'n';
      const created010 = `${folioPrefix}  ${randomFourDigitNumber()}${randomFourDigitNumber()}C423582`;
      const keywordOption = 'Keyword';
      const absent010ErrorText = 'Record cannot be saved without 010 field.';
      const selectedFolioFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const userPermissionsCentral = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];
      const userPermissionsMember = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
      ];

      before('Create users, data, and activate FOLIO file', () => {
        cy.resetTenant();
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423582_');
        cy.createTempUser(userPermissionsCentral).then((userProperties) => {
          users.userProperties = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
          cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(users.userProperties.userId, userPermissionsMember);
          cy.setTenant(Affiliations.University);
          cy.wait(10_000);
          cy.assignPermissionsToExistingUser(users.userProperties.userId, userPermissionsMember);
          cy.resetTenant();
          // Activate the selected FOLIO authority file
          ManageAuthorityFiles.setAuthorityFileToActiveViaApi(selectedFolioFile);
          cy.waitForAuthRefresh(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          MarcAuthorities.waitLoading();
        });
      });

      after('Delete users, data, and deactivate FOLIO file', () => {
        cy.resetTenant();
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(selectedFolioFile);
        Users.deleteViaApi(users.userProperties.userId);
        cy.setTenant(Affiliations.College);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423582_');
      });

      it(
        'C423582 Create a new local MARC authority record with "FOLIO" authority file selected at Member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C423582'] },
        () => {
          // Step 1: Click Actions > + New
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();

          // Step 2: Select any default FOLIO authority file
          MarcAuthority.selectSourceFile(selectedFolioFile);
          QuickMarcEditor.checkContentByTag('001', '');

          // Step 3: Add 100 field
          QuickMarcEditor.addNewField('100', `$a ${testData.marcValue}`, 3);

          // Step 4: Try to save, expect error for missing 010
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(absent010ErrorText);
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);

          // Step 5: Add 010 field with correct prefix and identifier
          QuickMarcEditor.addNewField('010', `$a ${created010}`, 4);
          QuickMarcEditor.checkContentByTag('010', `$a ${created010}`);

          // Step 6: Save successfully
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(testData.headerText);
          MarcAuthority.contains(`001\t.*${created010}`, { regexp: true });
          MarcAuthority.contains(`$a ${created010}`);

          // Step 7: Switch to Member 2 tenant
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          MarcAuthorities.waitLoading();

          // Step 8: Search by 010 in Member 2
          MarcAuthorities.searchBy(keywordOption, created010);
          MarcAuthorities.verifyEmptySearchResults(created010.replace('  ', ' '));

          // Step 9: Switch to Central tenant
          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          MarcAuthorities.waitLoading();

          // Step 10: Search by 010 in Central
          MarcAuthorities.searchBy(keywordOption, created010);
          MarcAuthorities.verifyEmptySearchResults(created010.replace('  ', ' '));
        },
      );
    });
  });
});
