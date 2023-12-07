import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';

const testData = {
  marc: 'marcBibFileC387462.mrc',
  fileName: `testMarcFileC387462.${getRandomPostfix()}.mrc`,
  jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  instanceTitle: 'The Journal of ecclesiastical history.',
  searchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
};

let instanceId;

describe('MARC › MARC Holdings', () => {
  before('Create test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiInventoryViewCreateEditHoldings.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.getAdminToken().then(() => {
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoint) => {
          testData.servicePointId = servicePoint[0].id;
          NewLocation.createViaApi(NewLocation.getDefaultLocation(testData.servicePointId)).then(
            (res) => {
              testData.location = res;
            },
          );
        });
      });

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(testData.marc, testData.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(testData.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(testData.fileName);
        Logs.getCreatedItemsID().then((link) => {
          instanceId = link.split('/')[5];
        });
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(instanceId);
  });

  it(
    'C387462 Add multiple 001s when creating "MARC Holdings" record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.clickMARCSourceCheckBox();
      InventorySearchAndFilter.selectSearchOptions(testData.searchOption, testData.instanceTitle);
      InventorySearchAndFilter.clickSearch();
      InventoryInstance.selectTopRecord();
      InventoryInstance.goToMarcHoldingRecordAdding();
      QuickMarcEditor.selectExistingHoldingsLocation(testData.location);
      QuickMarcEditor.addRow(5);
      QuickMarcEditor.fillAllAvailableValues('$a test', '001', 5);
      QuickMarcEditor.pressSaveAndClose();
    },
  );
});
