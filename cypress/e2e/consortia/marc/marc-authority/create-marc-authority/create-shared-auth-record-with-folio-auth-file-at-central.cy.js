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
        marcValue: `AT_C423569_MarcAuthority_${randomPostfix}`,
        headerText: 'Create a new shared MARC authority record',
        editHeaderText: 'Edit shared MARC authority record',
        AUTHORIZED: 'Authorized',
        sharedIcon: 'Shared',
      };
      const folioPrefix = 'n';
      const created010 = `${folioPrefix}  ${randomFourDigitNumber()}${randomFourDigitNumber()}C423569`;
      const keywordOption = 'Keyword';
      const selectedFolioFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;

      before('Create users, data, and activate FOLIO file', () => {
        cy.resetTenant();
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423569_');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((userProperties) => {
          users.userProperties = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(users.userProperties.userId, [
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]);
          cy.resetTenant();
          // Activate all default FOLIO authority files
          ManageAuthorityFiles.setAuthorityFileToActiveViaApi(selectedFolioFile);
          cy.waitForAuthRefresh(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
          MarcAuthorities.waitLoading();
        });
      });

      after('Delete users, data, and deactivate FOLIO file', () => {
        cy.resetTenant();
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(selectedFolioFile);
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423569_');
      });

      it(
        'C423569 Create a new shared MARC authority record with "FOLIO" authority file selected at Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C423569'] },
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
          QuickMarcEditor.checkCallout('Record cannot be saved without 010 field.');
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

          // Step 7: Switch to Member tenant
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          MarcAuthorities.waitLoading();

          // Step 8: Search by 010
          MarcAuthorities.searchBy(keywordOption, created010);
          MarcAuthorities.checkAfterSearch(
            testData.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValue}`,
          );
          MarcAuthority.verifyHeader(testData.marcValue);

          // Step 9: Filter by Authority source
          MarcAuthorities.chooseAuthoritySourceOption(selectedFolioFile);
          MarcAuthorities.checkSelectedAuthoritySource(selectedFolioFile);
          MarcAuthorities.checkAfterSearch(
            testData.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValue}`,
          );
          MarcAuthority.verifyHeader(testData.marcValue);

          // Step 10: Edit the record
          MarcAuthority.edit();
          QuickMarcEditor.checkPaneheaderContains(testData.editHeaderText);
          QuickMarcEditor.checkPaneheaderContains(testData.marcValue);
        },
      );
    });
  });
});
