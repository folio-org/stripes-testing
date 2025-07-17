import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { APPLICATION_NAMES, DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

const randomPostfix = getRandomPostfix();
const newBaseUrl = `https://autotest/MeSH/C436915/${randomPostfix}/`;
const defaultBaseUrl = 'https://id.nlm.nih.gov/mesh/';
const defaultPrefixes = 'D';
const marcAuthorityTabName = 'MARC authority';
const manageAuthFilesOption = 'Manage authority files';
const authorityFields = [
  { tag: '100', content: `$a AT_C436915_MarcAuthority_${randomPostfix}`, indicators: ['\\', '\\'] },
];
const authorityNaturalIdDigits = `2${randomFourDigitNumber()}${randomFourDigitNumber()}${randomFourDigitNumber()}`;

const userPermissionsCentral = [Permissions.uiSettingsManageAuthorityFiles.gui];
const userPermissionsMember = [Permissions.uiSettingsViewAuthorityFiles.gui];

let user;
let createdAuthorityRecordId;

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        before(
          'Create user and set up authority file with assigned record at Member tenant',
          () => {
            cy.resetTenant();
            cy.getAdminToken();
            ManageAuthorityFiles.setAuthorityFileToActiveViaApi(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
            );
            ManageAuthorityFiles.updateBaseUrlInAuthorityFileViaApi(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
              defaultBaseUrl,
            );
            cy.createTempUser(userPermissionsCentral).then((createdUser) => {
              user = createdUser;
              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, userPermissionsMember);
              cy.resetTenant();
              cy.getAdminToken();
              // Create MARC authority record at Member tenant (College)
              cy.setTenant(Affiliations.College);
              MarcAuthorities.createMarcAuthorityViaAPI(
                defaultPrefixes,
                authorityNaturalIdDigits,
                authorityFields,
              ).then((createdRecordId) => {
                createdAuthorityRecordId = createdRecordId;
              });
            });
          },
        );

        after('Restore default authority file values and delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(
            DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
          );
          ManageAuthorityFiles.updateBaseUrlInAuthorityFileViaApi(
            DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
            defaultBaseUrl,
          );
          Users.deleteViaApi(user.userId);
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteViaAPI(createdAuthorityRecordId, true);
        });

        it(
          'C436915 Edit all editable fields of FOLIO "Authority file" which has assigned "MARC authority" records at Member tenant, from Member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C436915'] },
          () => {
            // Step 1: Login as user and go to Settings > MARC authority > Manage authority files from Member tenant
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, marcAuthorityTabName);
              SettingsPane.waitLoading();
              cy.reload();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            }, 20_000);
            SettingsPane.waitLoading();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, marcAuthorityTabName);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExists(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
              defaultPrefixes,
              '',
              defaultBaseUrl,
              true,
              '',
              false,
            );
            // Step 2: Click Edit (pencil) icon
            ManageAuthorityFiles.clickEditButton(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
            );
            ManageAuthorityFiles.checkRowEditableInEditModeInFolioFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
              defaultPrefixes,
              '',
              defaultBaseUrl,
              true,
              false,
              true,
            );
            ManageAuthorityFiles.checkNewButtonEnabled(false);
            // Step 3: Update editable fields
            ManageAuthorityFiles.editBaseUrlInFolioFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
              newBaseUrl,
            );
            ManageAuthorityFiles.switchActiveCheckboxInFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
              false,
            );
            // Save button should now be enabled
            ManageAuthorityFiles.checkSaveButtonEnabledInFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
              true,
            );
            // Step 4: Click Save
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
            );
            ManageAuthorityFiles.checkAfterSaveEditedFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
            );
            ManageAuthorityFiles.checkSourceFileExists(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
              defaultPrefixes,
              '',
              newBaseUrl,
              false,
              '',
              false,
            );
            // Step 5: Switch active affiliation to Central tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            // Step 6: Verify updated values in Central tenant
            ManageAuthorityFiles.checkSourceFileExists(
              DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
              defaultPrefixes,
              '',
              newBaseUrl,
              false,
              '',
              false,
            );
          },
        );
      });
    });
  });
});
