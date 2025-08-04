import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const testData = {
  marc: 'marcBibFileC496215.mrc',
  fileName: `testMarcFileC496215.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
  propertyName: 'instance',
  instanceTitle: 'C496215The Journal of ecclesiastical history.',
  searchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
  tag005value: '20240804120000.0',
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
          ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
            testData.servicePointId = servicePoint.id;
            NewLocation.createViaApi(NewLocation.getDefaultLocation(testData.servicePointId)).then(
              (res) => {
                testData.location = res;
              },
            );
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
      'C496215 Add multiple 005s when creating "MARC Holdings" record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C496215'] },
      () => {
        // #1 Navigate to Instance and click "Actions" → "+Add MARC holdings record"
        InventoryInstances.searchBySource(INSTANCE_SOURCE_NAMES.MARC);
        InventorySearchAndFilter.selectSearchOptions(testData.searchOption, testData.instanceTitle);
        InventorySearchAndFilter.clickSearch();
        InventoryInstance.selectTopRecord();
        InventoryInstance.goToMarcHoldingRecordAdding();

        // #2 Fill in "852" subfield with $b value and save location
        QuickMarcEditor.selectExistingHoldingsLocation(testData.location);

        // #3 Click on the "+" (Add a new field) icon
        QuickMarcEditor.addEmptyFields(5);
        QuickMarcEditor.checkEmptyFieldAdded(6);

        // #4 Fill in the new $a subfield with any values
        QuickMarcEditor.updateExistingFieldContent(6, `$a ${testData.tag005value}`);

        // #5 Fill in the first box of added field with the "005" MARC tag
        QuickMarcEditor.updateTagNameToLockedTag(6, '005');
        QuickMarcEditor.checkFourthBoxEditable(6, false);

        // #6 Click on the "Save & close" button
        QuickMarcEditor.pressSaveAndClose();
        HoldingsRecordView.waitLoading();

        // #7 Click "Actions" → "Edit in QuickMARC"
        HoldingsRecordView.editInQuickMarc();

        // Verify only one "005" field is displayed with system-generated value
        QuickMarcEditor.verifyNoFieldWithContent(testData.tag005value);
      },
    );
  });
});
