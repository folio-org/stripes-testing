import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const titlePrefix = 'C410715-MSEARCH-588';
    const users = {};
    const createdRecordIDs = [];
    const sharedFOLIOInstance = {
      title: `${titlePrefix} Shared FOLIO`,
    };
    const localM1FOLIOInstance = {
      title: `${titlePrefix} Local FOLIO`,
    };
    const localM2FOLIOInstance = {
      title: `${titlePrefix} Local FOLIO Member 2`,
    };

    const sharedMarcTitle = 'C410715-MSEARCH-588 Shared MARC';
    const localM1MarcTitle = 'C410715-MSEARCH-588 Local MARC';
    const localM2MarcTitle = 'C410715-MSEARCH-588 Local MARC Member 2';

    const marcFiles = [
      {
        marc: 'marcBibFileForC410715-Shared.mrc',
        fileName: `C410715 Central testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        tenant: tenantNames.central,
      },
      {
        marc: 'marcBibFileForC410715-Local-M1.mrc',
        fileName: `C410715 Local testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        tenant: tenantNames.university,
      },
      {
        marc: 'marcBibFileForC410715-Local-M2.mrc',
        fileName: `C410715 Local testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        tenant: tenantNames.college,
      },
    ];

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          users.userProperties = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(users.userProperties.userId, [
            Permissions.uiInventoryViewInstances.gui,
          ]);
        })
        .then(() => {
          cy.resetTenant();
          InventoryInstance.createInstanceViaApi({
            instanceTitle: sharedFOLIOInstance.title,
          }).then((instanceData) => {
            sharedFOLIOInstance.id = instanceData.instanceData.instanceId;
          });

          cy.setTenant(Affiliations.University);
          InventoryInstance.createInstanceViaApi({
            instanceTitle: localM1FOLIOInstance.title,
          }).then((instanceDataLocal) => {
            localM1FOLIOInstance.id = instanceDataLocal.instanceData.instanceId;
          });

          cy.setTenant(Affiliations.College);
          InventoryInstance.createInstanceViaApi({
            instanceTitle: localM2FOLIOInstance.title,
          }).then((instanceDataLocal) => {
            localM2FOLIOInstance.id = instanceDataLocal.instanceData.instanceId;
          });
        })
        .then(() => {
          cy.resetTenant();
          cy.loginAsAdmin().then(() => {
            marcFiles.forEach((marcFile) => {
              cy.visit(TopMenu.dataImportPath);
              if (marcFile.tenant === 'University') {
                ConsortiumManager.switchActiveAffiliation(
                  tenantNames.central,
                  tenantNames.university,
                );
              } else if (marcFile.tenant === 'College') {
                ConsortiumManager.switchActiveAffiliation(
                  tenantNames.university,
                  tenantNames.college,
                );
              }
              DataImport.verifyUploadState();
              DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              JobProfiles.waitFileIsImported(marcFile.fileName);
              Logs.checkJobStatus(marcFile.fileName, JOB_STATUS_NAMES.COMPLETED);
              Logs.openFileDetails(marcFile.fileName);
              Logs.getCreatedItemsID().then((link) => {
                createdRecordIDs.push(link.split('/')[5]);
              });
            });

            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
              InventorySearchAndFilter.searchTabIsDefault();
              InventorySearchAndFilter.instanceTabIsDefault();
            });
          });
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(users.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(sharedFOLIOInstance.id);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      cy.setTenant(Affiliations.University);
      InventoryInstance.deleteInstanceViaApi(localM1FOLIOInstance.id);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[1]);
      cy.setTenant(Affiliations.College);
      InventoryInstance.deleteInstanceViaApi(localM2FOLIOInstance.id);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[2]);
    });

    it(
      'C410715 "Shared" and "Local" (for current tenant) records will be found from "Instance/Holdings/Item" tabs of "inventory" app on Member tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire'] },
      () => {
        InventoryInstances.searchByTitle(titlePrefix);
        InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstance.title);
        InventorySearchAndFilter.verifySearchResult(localM1FOLIOInstance.title);
        InventorySearchAndFilter.verifySearchResult(sharedMarcTitle);
        InventorySearchAndFilter.verifySearchResult(localM1MarcTitle);
        InventorySearchAndFilter.verifySearchResult(localM2FOLIOInstance.title, false);
        InventorySearchAndFilter.verifySearchResult(localM2MarcTitle, false);

        InventorySearchAndFilter.switchToHoldings();
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.checkSearchQueryText('');
        InventoryInstances.searchByTitle(titlePrefix);
        InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstance.title);
        InventorySearchAndFilter.verifySearchResult(localM1FOLIOInstance.title);
        InventorySearchAndFilter.verifySearchResult(sharedMarcTitle);
        InventorySearchAndFilter.verifySearchResult(localM1MarcTitle);
        InventorySearchAndFilter.verifySearchResult(localM2FOLIOInstance.title, false);
        InventorySearchAndFilter.verifySearchResult(localM2MarcTitle, false);

        InventorySearchAndFilter.switchToItem();
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.checkSearchQueryText('');
        InventoryInstances.searchByTitle(titlePrefix);
        InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstance.title);
        InventorySearchAndFilter.verifySearchResult(localM1FOLIOInstance.title);
        InventorySearchAndFilter.verifySearchResult(sharedMarcTitle);
        InventorySearchAndFilter.verifySearchResult(localM1MarcTitle);
        InventorySearchAndFilter.verifySearchResult(localM2FOLIOInstance.title, false);
        InventorySearchAndFilter.verifySearchResult(localM2MarcTitle, false);
      },
    );
  });
});
