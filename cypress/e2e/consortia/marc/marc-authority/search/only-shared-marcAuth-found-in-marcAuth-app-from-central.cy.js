import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { JOB_STATUS_NAMES } from '../../../../../support/constants';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const testData = {
        marcValueShared: 'C410739 Shared DiCaprio',
        marcValueLocal: 'C410739 Local Jackson',
        testId: 'C410739',
        recordTypesAndValues: {
          AUTHORIZED: 'Authorized',
          REFERENCE: 'Reference',
          AUTHREF: 'Auth/Ref',
          referenceValue: 'C410739 Shared DiCaprio 1',
          authRefValue: 'C410739 Shared DiCaprio Titanic',
        },
        authoritySearchOption: 'Keyword',
        authorityBrowseOption: 'Personal name',
        sharedIcon: 'Shared',
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcAuthFileForC410739-Shared.mrc',
          fileNameImported: `testMarcFileC410814.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          tenant: 'Central Office',
        },
        {
          marc: 'marcAuthFileForC410739-Local.mrc',
          fileNameImported: `testMarcFileC410814.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          tenant: 'College',
        },
      ];

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.resetTenant();
            cy.loginAsAdmin().then(() => {
              marcFiles.forEach((marcFile) => {
                cy.visit(TopMenu.dataImportPath);
                if (marcFile.tenant === 'College') {
                  ConsortiumManager.switchActiveAffiliation(
                    tenantNames.central,
                    tenantNames.college,
                  );
                  DataImport.waitLoading();
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                }
                DataImport.verifyUploadState();
                DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileNameImported);
                JobProfiles.waitLoadingList();
                JobProfiles.search(marcFile.jobProfileToRun);
                JobProfiles.runImportFile();
                Logs.waitFileIsImported(marcFile.fileNameImported);
                Logs.checkJobStatus(marcFile.fileNameImported, JOB_STATUS_NAMES.COMPLETED);
                Logs.openFileDetails(marcFile.fileNameImported);
                Logs.getCreatedItemsID().then((link) => {
                  createdRecordIDs.push(link.split('/')[5]);
                });
              });

              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdRecordIDs[0]);
        cy.setTenant(Affiliations.College);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C410739 Only Shared "MARC authority" records are found in "MARC authority" app from Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.marcValueShared);
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValue}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHREF,
            `${testData.sharedIcon}${testData.recordTypesAndValues.authRefValue}`,
          );

          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.marcValueLocal);
          MarcAuthorities.checkNoResultsMessage(
            `No results found for "${testData.marcValueLocal}". Please check your spelling and filters.`,
          );

          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.testId);
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValue}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHREF,
            `${testData.sharedIcon}${testData.recordTypesAndValues.authRefValue}`,
          );

          MarcAuthorities.switchToBrowse();
          MarcAuthorities.searchByParameter(
            testData.authorityBrowseOption,
            testData.marcValueShared,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValue}`,
          );

          MarcAuthorities.searchByParameter(
            testData.authorityBrowseOption,
            testData.marcValueLocal,
          );
          InventorySearchAndFilter.verifySearchResult(`${testData.marcValueLocal} would be here`);

          MarcAuthorities.searchByParameter(testData.authorityBrowseOption, testData.testId);
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValue}`,
          );
        },
      );
    });
  });
});
