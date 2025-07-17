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
const newBaseUrl = `https://autotest/LCNAF/C436910/${randomPostfix}/`;
const defaultBaseUrl = 'http://id.loc.gov/authorities/names/';
const defaultPrefixes = 'n,nb,nr,no,ns';
const marcAuthorityTabName = 'MARC authority';
const manageAuthFilesOption = 'Manage authority files';
const authorityFields = [
  { tag: '100', content: `$a AT_C436910_MarcAuthority_${randomPostfix}`, indicators: ['\\', '\\'] },
];
const authorityNaturalIdDigits = `1${randomFourDigitNumber()}${randomFourDigitNumber()}${randomFourDigitNumber()}`;

const userPermissionsCentral = [Permissions.uiSettingsManageAuthorityFiles.gui];
const userPermissionsMember = [Permissions.uiSettingsViewAuthorityFiles.gui];

let user;
let createdAuthorityRecordId;

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        before('Create user and get original authority file values', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ManageAuthorityFiles.setAuthorityFileToActiveViaApi(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
          );
          ManageAuthorityFiles.updateBaseUrlInAuthorityFileViaApi(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
            defaultBaseUrl,
          );
          cy.createTempUser(userPermissionsCentral).then((createdUser) => {
            user = createdUser;
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, userPermissionsMember);
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.createMarcAuthorityViaAPI(
              defaultPrefixes.split(',')[0],
              authorityNaturalIdDigits,
              authorityFields,
            ).then((createdRecordId) => {
              createdAuthorityRecordId = createdRecordId;
            });
          });
        });

        after('Restore default authority file values and delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
          );
          ManageAuthorityFiles.updateBaseUrlInAuthorityFileViaApi(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
            defaultBaseUrl,
          );
          Users.deleteViaApi(user.userId);
          MarcAuthorities.deleteViaAPI(createdAuthorityRecordId, true);
        });

        it(
          'C436910 Edit all editable fields of FOLIO "Authority file" which has assigned "MARC authority" records at Central tenant, from Central tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C436910'] },
          () => {
            cy.login(user.username, user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, marcAuthorityTabName);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExists(
              DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
              defaultPrefixes,
              '',
              defaultBaseUrl,
              true,
              '',
              false,
            );
            ManageAuthorityFiles.clickEditButton(
              DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
            );
            ManageAuthorityFiles.checkRowEditableInEditModeInFolioFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
              defaultPrefixes,
              '',
              defaultBaseUrl,
              true,
              false,
              true,
            );
            ManageAuthorityFiles.checkNewButtonEnabled(false);
            ManageAuthorityFiles.editBaseUrlInFolioFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
              newBaseUrl,
            );
            ManageAuthorityFiles.switchActiveCheckboxInFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
              false,
            );
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
            );
            ManageAuthorityFiles.checkAfterSaveEditedFile(
              DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
            );
            ManageAuthorityFiles.checkSourceFileExists(
              DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
              defaultPrefixes,
              '',
              newBaseUrl,
              false,
              '',
              false,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExists(
              DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
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
