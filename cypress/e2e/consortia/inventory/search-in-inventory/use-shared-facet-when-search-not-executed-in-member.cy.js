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
import { JOB_STATUS_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const titlePostfix = getRandomPostfix();
    const users = {};
    const createdRecordIDs = [];
    const sharedFOLIOInstance = {
      title: `!%@:: !@#! C402330 Shared FOLIO Instance ${titlePostfix}`,
    };
    const localFOLIOInstance = {
      title: `!%@:: !@#! C402330 Local FOLIO Instance ${titlePostfix}`,
    };

    const marcFiles = [
      {
        marc: 'marcBibFileForC402330Central.mrc',
        fileName: `C402330 Central testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tenant: tenantNames.central,
      },
      {
        marc: 'marcBibFileForC402330LocalMember1.mrc',
        fileName: `C402330 Local testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tenant: tenantNames.college,
      },
    ];

    const Dropdowns = {
      SHARED: 'Shared',
      YES: 'Yes',
      NO: 'No',
    };

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          users.userProperties = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
          cy.setTenant(Affiliations.College);
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

            cy.setTenant(Affiliations.College);
            InventoryInstance.createInstanceViaApi({
              instanceTitle: localFOLIOInstance.title,
            }).then((instanceDataLocal) => {
              localFOLIOInstance.id = instanceDataLocal.instanceData.instanceId;
            });
          });
        })
        .then(() => {
          cy.resetTenant();
          cy.loginAsAdmin().then(() => {
            marcFiles.forEach((marcFile) => {
              cy.visit(TopMenu.dataImportPath);
              if (marcFile.tenant === 'College') {
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
                DataImport.waitLoading();
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
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
          });

          cy.login(users.userProperties.username, users.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventorySearchAndFilter.searchTabIsDefault();
            InventorySearchAndFilter.instanceTabIsDefault();
          });
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(users.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(sharedFOLIOInstance.id);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      cy.setTenant(Affiliations.College);
      InventoryInstance.deleteInstanceViaApi(localFOLIOInstance.id);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[1]);
    });

    it(
      'C402330 Use "Shared" facet when Search was not executed in "Member" tenant ("Instance" tab) (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire'] },
      () => {
        // 1 Expand the "Shared" accordion button by clicking on it.
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO);

        // 2 Check the "No" checkbox in expanded "Shared" accordion.
        InventorySearchAndFilter.selectOptionInExpandedFilter(Dropdowns.SHARED, Dropdowns.NO);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
        InventorySearchAndFilter.verifyResultListExists();
        InventorySearchAndFilter.checkNoSharedInstancesInResultList();

        // 3 Open any "Instance" record by clicking on its title in the result pane
        InventoryInstances.selectInstance(1);
        InventoryInstance.waitInventoryLoading();
        InventoryInstance.checkSharedTextInDetailView(false);

        // 4 Uncheck the "No" checkbox in expanded "Shared" accordion.
        InventorySearchAndFilter.selectOptionInExpandedFilter(
          Dropdowns.SHARED,
          Dropdowns.NO,
          false,
        );
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
        InventorySearchAndFilter.verifyResultPaneEmpty(true);

        // 5 Check the "Yes" checkbox in expanded "Shared" accordion.
        InventorySearchAndFilter.selectOptionInExpandedFilter(Dropdowns.SHARED, Dropdowns.YES);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
        InventorySearchAndFilter.verifyResultListExists();
        InventorySearchAndFilter.checkSharedInstancesInResultList();

        // 6 Open any "Instance" record by clicking on its title in the result pane.
        InventoryInstances.selectInstance(1);
        InventoryInstance.waitInventoryLoading();
        InventoryInstance.checkSharedTextInDetailView(true);

        // 7 Uncheck the "Yes" checkbox in expanded "Shared" accordion.
        InventorySearchAndFilter.selectOptionInExpandedFilter(
          Dropdowns.SHARED,
          Dropdowns.YES,
          false,
        );
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
        InventorySearchAndFilter.verifyResultPaneEmpty(true);

        // 8 Check both "No" and "Yes" checkboxes in expanded "Shared" accordion.
        InventorySearchAndFilter.selectOptionInExpandedFilter(Dropdowns.SHARED, Dropdowns.YES);
        InventorySearchAndFilter.selectOptionInExpandedFilter(Dropdowns.SHARED, Dropdowns.NO);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);
        InventorySearchAndFilter.verifyResultListExists();
        InventorySearchAndFilter.checkSharedAndLocalInstancesInResultList();

        // 9 Scroll down to the end of the result list and click on the "Next" pagination button.
        InventorySearchAndFilter.clickListInventoryNextPaginationButton();
        InventorySearchAndFilter.verifyContentNotExistInSearchResult(sharedFOLIOInstance.title);
        InventorySearchAndFilter.verifyContentNotExistInSearchResult(localFOLIOInstance.title);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);

        // 10 Scroll down to the end of the result list and click on the "Previous" pagination button.
        InventorySearchAndFilter.clickListInventoryPreviousPaginationButton();
        InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstance.title);
        InventorySearchAndFilter.verifySearchResult(localFOLIOInstance.title);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);

        // 11 Collapse "Shared" accordion by clicking on it.
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, false);
        InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstance.title);
        InventorySearchAndFilter.verifySearchResult(localFOLIOInstance.title);

        // 12 Expand "Shared" accordion by clicking on it.
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, true);

        // 13 Cancel facet selection by clicking on "x" icon placed in the "Shared" accordion button.
        InventorySearchAndFilter.clearSharedFilter();
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
        InventorySearchAndFilter.verifyResultPaneEmpty(true);
      },
    );
  });
});
