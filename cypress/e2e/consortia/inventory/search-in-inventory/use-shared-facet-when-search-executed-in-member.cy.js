import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      sharedInstance: {
        title: `C402334 "Shared" facet test Instance 1 Shared Folio ${getRandomPostfix()}`,
      },
      localInstance: {
        title: `C402334 "Shared" facet test Instance 1 Local Folio ${getRandomPostfix()}`,
      },
      instanceValue: 'C402334 "Shared" facet test Instance',
      importedLocalInstance: String.raw`C402334 "Shared" facet test Instance 2 Local MARC  One turtle's last straw : the real-life rescue that sparked a sea change / written by Elisa Boxer ; illustrated by Marta Álvarez Miguéns.`,
      importedSharedInstance:
        'C402334 "Shared" facet test Instance 2 Shared MARC  Snow leopards and other wild cats / by Mary Pope Osborne and Jenny Laird ; illustrated by Isidre Monés.',
    };

    const Dropdowns = {
      SHARED: 'Shared',
      YES: 'Yes',
      NO: 'No',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileForC402334Shared.mrc',
        fileNameImported: `testMarcFileC405549.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tenant: 'Central Office',
        propertyName: 'instance',
      },
      {
        marc: 'marcBibFileForC402334Local.mrc',
        fileNameImported: `testMarcFileC405549.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tenant: 'College',
        propertyName: 'instance',
      },
    ];

    const createdRecordIDs = [];

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          testData.userProperties = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
            Permissions.uiInventoryViewInstances.gui,
          ]);
        })
        .then(() => {
          cy.resetTenant();
          InventoryInstance.createInstanceViaApi({
            instanceTitle: testData.sharedInstance.title,
          }).then((instanceData) => {
            testData.sharedInstance.id = instanceData.instanceData.instanceId;

            cy.setTenant(Affiliations.College);
            InventoryInstance.createInstanceViaApi({
              instanceTitle: testData.localInstance.title,
            }).then((instanceDataLocal) => {
              testData.localInstance.id = instanceDataLocal.instanceData.instanceId;
            });
          });
        })
        .then(() => {
          cy.resetTenant();
          cy.loginAsAdmin().then(() => {
            marcFiles.forEach((marcFile) => {
              cy.visit(TopMenu.dataImportPath);
              if (marcFile.tenant === 'College') {
                cy.setTenant(Affiliations.College);
              } else {
                cy.resetTenant();
                cy.getAdminToken();
              }

              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileNameImported,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
          });

          cy.resetTenant();
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(testData.sharedInstance.id);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      cy.setTenant(Affiliations.College);
      InventoryInstance.deleteInstanceViaApi(testData.localInstance.id);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[1]);
    });

    it(
      'C844208 Use "Shared" facet when Search was executed in "Member" tenant ("Instance" tab) (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C844208'] },
      () => {
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO);

        InventorySearchAndFilter.byKeywords(testData.instanceValue);
        InventorySearchAndFilter.verifySearchResult(testData.localInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.sharedInstance.title);
        InventoryInstance.verifySharedIcon(1);
        InventorySearchAndFilter.verifySearchResult(testData.importedLocalInstance);
        InventorySearchAndFilter.verifySearchResult(testData.importedSharedInstance);
        InventoryInstance.verifySharedIcon(3);
        InventorySearchAndFilter.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.YES, 2);
        InventorySearchAndFilter.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.NO, 2);

        InventorySearchAndFilter.selectOptionInExpandedFilter(Dropdowns.SHARED, Dropdowns.NO);
        InventorySearchAndFilter.verifySearchResult(testData.localInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.importedLocalInstance);
        InventoryInstance.verifySharedIconAbsent(0);
        InventoryInstance.verifySharedIconAbsent(1);
        InventoryInstances.selectInstance();
        InventoryInstance.checkSharedTextInDetailView(false);

        InventorySearchAndFilter.selectOptionInExpandedFilter(
          Dropdowns.SHARED,
          Dropdowns.NO,
          false,
        );
        InventorySearchAndFilter.verifySearchResult(testData.localInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.sharedInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.importedLocalInstance);
        InventorySearchAndFilter.verifySearchResult(testData.importedSharedInstance);

        InventorySearchAndFilter.selectOptionInExpandedFilter(Dropdowns.SHARED, Dropdowns.YES);
        InventorySearchAndFilter.verifySearchResult(testData.sharedInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.importedSharedInstance);
        InventoryInstance.verifySharedIcon(0);
        InventoryInstance.verifySharedIcon(1);
        InventoryInstances.selectInstance();
        InventoryInstance.checkSharedTextInDetailView();
        InventoryInstance.verifySharedIcon(0);
        InventoryInstance.verifySharedIcon(1);

        InventorySearchAndFilter.closeInstanceDetailPane();
        InventoryInstance.verifySharedIcon(0);
        InventoryInstance.verifySharedIcon(1);
        InventorySearchAndFilter.selectOptionInExpandedFilter(
          Dropdowns.SHARED,
          Dropdowns.YES,
          false,
        );
        InventorySearchAndFilter.verifySearchResult(testData.localInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.sharedInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.importedLocalInstance);
        InventorySearchAndFilter.verifySearchResult(testData.importedSharedInstance);

        InventorySearchAndFilter.selectOptionInExpandedFilter(Dropdowns.SHARED, Dropdowns.YES);
        InventorySearchAndFilter.selectOptionInExpandedFilter(Dropdowns.SHARED, Dropdowns.NO);
        InventorySearchAndFilter.verifySearchResult(testData.localInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.sharedInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.importedLocalInstance);
        InventorySearchAndFilter.verifySearchResult(testData.importedSharedInstance);

        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
        InventorySearchAndFilter.verifyResultPaneEmpty(true);
        InventorySearchAndFilter.verifySearchFieldIsEmpty();

        InventoryInstances.searchInstancesWithOption('Title (all)', testData.instanceValue);
        InventorySearchAndFilter.verifySearchResult(testData.localInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.sharedInstance.title);
        InventorySearchAndFilter.verifySearchResult(testData.importedLocalInstance);
        InventorySearchAndFilter.verifySearchResult(testData.importedSharedInstance);
        InventorySearchAndFilter.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.YES, 2);
        InventorySearchAndFilter.verifyFilterOptionCount(Dropdowns.SHARED, Dropdowns.NO, 2);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.YES, false);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, Dropdowns.NO, false);
      },
    );
  });
});
