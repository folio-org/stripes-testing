import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { FOLIO_SUBJECT_TYPES } from '../../../../support/fragments/settings/inventory/instances/subjectTypes';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const testData = {
        subjectBrowseoption: 'Subjects',
        accordionName: 'Subject type',
      };
      const marcFile = {
        filePath: 'marcBibFileForC584535.mrc',
        fileName: `C584535 autotestFile${getRandomPostfix()}.mrc`,
        jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          const preconditionUserId = userProperties.userId;

          DataImport.uploadFileViaApi(
            marcFile.filePath,
            marcFile.fileName,
            marcFile.jobProfile,
          ).then((response) => {
            testData.instanceId = response[0].instance.id;
          });
          cy.getAdminToken();
          Users.deleteViaApi(preconditionUserId);
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C584535 (CONSORTIA) Check "Subject type" facet on "Browse" page (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C584535'] },
        () => {
          InventorySearchAndFilter.verifySearchAndFilterPane();
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyBrowseOptions();
          BrowseSubjects.select();
          BrowseSubjects.verifyAccordionStatusByName(testData.accordionName, false);
          BrowseSubjects.expandAccordion(testData.accordionName);
          BrowseSubjects.verifyAccordionStatusByName(testData.accordionName, true);
          BrowseSubjects.verifySubjectTypeDropdownOptions(FOLIO_SUBJECT_TYPES);
        },
      );
    });
  });
});
