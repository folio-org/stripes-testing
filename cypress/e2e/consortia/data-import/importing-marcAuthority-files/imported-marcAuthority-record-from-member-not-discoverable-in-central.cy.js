import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  APPLICATION_NAMES,
  JOB_STATUS_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../support/constants';
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
        marc: 'marcAuthFileForC405519.mrc',
        fileName: `C405519 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
      };
      let createdAuthorityID;
      const searchRecordName = 'C405519 Gabaldon, Diana. Outlander novel.';
      const users = {};
      const type = 'Authorized';
      const headingType = 'Personal Name';
      const browseOption = 'Name-title';

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
              Permissions.moduleDataImportEnabled.gui,
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
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        cy.setTenant(Affiliations.University);
        MarcAuthority.deleteViaAPI(createdAuthorityID);
      });

      it(
        'C405519 Imported "MARC authority" record from Member tenant is not discoverable in Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C405519'] },
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
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBy('Keyword', searchRecordName);
          MarcAuthorities.verifyResultsRowContent(searchRecordName, type, headingType);
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.selectFirstRecord();
          MarcAuthorities.checkMarcViewSectionIsVisible(true);

          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(browseOption, searchRecordName);
          MarcAuthorities.verifyResultsRowContent(searchRecordName, type, headingType);

          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(browseOption, searchRecordName);
          MarcAuthorityBrowse.checkResultWithNoValue(searchRecordName);

          MarcAuthorities.switchToSearch();
          MarcAuthorities.checkDefaultSearchOptions(searchRecordName);
          MarcAuthorities.searchBeats(searchRecordName);
          MarcAuthorities.checkNoResultsMessage(
            `No results found for "${searchRecordName}". Please check your spelling and filters.`,
          );
        },
      );
    });
  });
});
