// import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
// import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../support/fragments/settings/inventory/settingsInventory';
import SubjectTypes from '../../../../support/fragments/settings/inventory/instances/subjectTypes';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      subjectBrowseoption: 'Subjects',
      accordionName: 'Subject type',
      instanceIds: [],
    };
    const marcFile = {
      filePath: 'marcBibFileForC584535.mrc',
      fileName: `C584535 autotestFile${getRandomPostfix()}.mrc`,
      jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    };

    before('Create user, data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        const preconditionUserId = userProperties.userId;

        DataImport.uploadFileViaApi(marcFile.filePath, marcFile.fileName, marcFile.jobProfile).then(
          (response) => {
            response.forEach((record) => {
              testData.instanceIds.push(record.instance.id);
            });
          },
        );
        cy.getAdminToken();
        Users.deleteViaApi(preconditionUserId);
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.userProperties = userProperties;

        cy.loginAsAdmin({ path: TopMenu.settingsPath, waiter: SettingsPane.waitLoading });
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
        SubjectTypes.getSubjectTypeNames().then((subjectTypeNames) => {
          testData.subjectTypeNames = subjectTypeNames;
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        // ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    // after('Delete user, data', () => {
    //   cy.resetTenant();
    //   cy.getAdminToken();
    //   Users.deleteViaApi(testData.userProperties.userId);
    // });

    it(
      'C584535 (CONSORTIA) Check "Subject type" facet on "Browse" page (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet', 'C584535'] },
      () => {
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();
        BrowseSubjects.select();
        BrowseSubjects.verifyAccordionStatusByName(testData.accordionName, false);
        BrowseSubjects.clickAccordionByName(testData.accordionName);
        BrowseSubjects.verifyAccordionStatusByName(testData.accordionName, true);
        console.log(testData.subjectTypeNames);
        testData.subjectTypeNames.forEach((_, index) => {
          BrowseSubjects.verify(testData.subjectTypeNames[index]);
        });
      },
    );
  });
});
