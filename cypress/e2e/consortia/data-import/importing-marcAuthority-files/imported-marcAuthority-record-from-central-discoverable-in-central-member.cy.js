import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { JOB_STATUS_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    describe('Consortia', () => {
      const marcFile = {
        marc: 'marcAuthFileForC405119.mrc',
        fileName: `C405119 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
      };
      let createdAuthorityID;
      const searchRecordName = 'C405119 Dante Alighieri, 1265-1321';
      const type = 'Authorized';
      const headingType = 'Personal Name';
      const browseOption = 'Personal name';
      const users = {};

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;

            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityID);
      });

      it(
        'C405119 Imported "MARC authority" record from Central tenant is discoverable in Central and Member tenants (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C405119'] },
        () => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then((link) => {
            createdAuthorityID = link.split('/')[5];
          });
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBy('Keyword', searchRecordName);
          MarcAuthorities.verifyResultsRowContent(searchRecordName, type, headingType);
          MarcAuthorities.checkRowsCount(1);

          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(browseOption, searchRecordName);
          MarcAuthorities.verifyResultsRowContent(searchRecordName, type, headingType);

          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);

          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(browseOption, searchRecordName);
          MarcAuthorities.verifyResultsRowContent(searchRecordName, type, headingType);

          MarcAuthorities.switchToSearch();
          MarcAuthorities.checkDefaultSearchOptions(searchRecordName);
          MarcAuthorities.searchBeats(searchRecordName);
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.verifyResultsRowContent(searchRecordName, type, headingType);
        },
      );
    });
  });
});
