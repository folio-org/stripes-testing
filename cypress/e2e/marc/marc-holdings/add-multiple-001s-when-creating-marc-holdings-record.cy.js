import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const testData = {
  marc: 'marcBibFileC387462.mrc',
  fileName: `testMarcFileC387462.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
  propertyName: 'instance',
  instanceTitle: 'C387462The Journal of ecclesiastical history.',
  searchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
};

let instanceId;

describe('MARC', () => {
  describe('MARC Holdings', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getAdminToken().then(() => {
          cy.getLocations().then((loc) => {
            testData.location = loc;
          });
        });

        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          testData.marc,
          testData.fileName,
          testData.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            instanceId = record[testData.propertyName].id;
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C387462 Add multiple 001s when creating "MARC Holdings" record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C387462'] },
      () => {
        // Wait for the inventory page to fully load
        InventoryInstances.waitContentLoading();
        // Search directly for the instance
        InventorySearchAndFilter.selectSearchOptions(testData.searchOption, testData.instanceTitle);
        InventorySearchAndFilter.clickSearch();
        InventoryInstance.selectTopRecord();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.updateExistingField('852', `$b ${testData.location.code}`);
        MarcAuthority.checkAddNew001Tag(5, '$a test');
        cy.wait(1000); // wait until redirect marc holding page
        QuickMarcEditor.closeEditorPane();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.updateExistingField('852', `$b ${testData.location.code}`);
        MarcAuthority.checkAddNew001Tag(5, '$a test');
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.verifyOnlyOne001FieldAreDisplayed();
      },
    );
  });
});
