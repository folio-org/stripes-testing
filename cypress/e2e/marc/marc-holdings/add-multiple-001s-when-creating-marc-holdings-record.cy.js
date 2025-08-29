import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
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
          ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then(
            (servicePoint) => {
              testData.servicePointId = servicePoint[0].id;
              NewLocation.createViaApi(
                NewLocation.getDefaultLocation(testData.servicePointId),
              ).then((res) => {
                testData.location = res;
              });
            },
          );
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
        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
        }, 20_000);
        InventoryInstances.waitContentLoading();
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
        InventoryInstances.searchBySource(INSTANCE_SOURCE_NAMES.MARC);
        InventorySearchAndFilter.selectSearchOptions(testData.searchOption, testData.instanceTitle);
        InventorySearchAndFilter.clickSearch();
        InventoryInstance.selectTopRecord();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.selectExistingHoldingsLocation(testData.location);
        MarcAuthority.checkAddNew001Tag(5, '$a test');
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.close();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.selectExistingHoldingsLocation(testData.location);
        MarcAuthority.checkAddNew001Tag(5, '$a test');
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.verifyOnlyOne001FieldAreDisplayed();
      },
    );
  });
});
