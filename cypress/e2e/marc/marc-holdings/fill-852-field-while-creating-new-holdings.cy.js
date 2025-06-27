import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      tag851: '851',
      tag852: '852',
      tag851value: '$a subfield with any value',
    };
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    let defaultLocation;
    let user;

    before(() => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((createdUserProperties) => {
        cy.getLocations({ query: '(name<>"AT_*" and name<>"*autotest*")' }).then((location) => {
          testData.tag852_B_value = `$b ${location.code}`;
          testData.tag852_B_E_values = `$b ${location.code} $e Test`;
          defaultLocation = location;
        });
        user = createdUserProperties;
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.recordID = record[marcFile.propertyName].id;
              });
            });
          },
        );
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      cy.deleteHoldingRecordViaApi(testData.holdingsID);
      InventoryInstance.deleteInstanceViaApi(testData.recordID);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C358990 Verify user can fill in "852 $b" field by typing text when create new "MARC Holdings" record (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C358990'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(testData.recordID);
        InventoryInstances.selectInstance();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.updateExistingField(testData.tag852, testData.tag852_B_value);
        QuickMarcEditor.checkContent(testData.tag852_B_value, 5);
        QuickMarcEditor.updateExistingField(testData.tag852, testData.tag852_B_E_values);
        QuickMarcEditor.checkContent(testData.tag852_B_E_values, 5);
        QuickMarcEditor.addNewField(testData.tag851, testData.tag851value, 5);
        QuickMarcEditor.moveFieldUp(6);
        QuickMarcEditor.checkContent(testData.tag851value, 5);
        QuickMarcEditor.checkContent(testData.tag852_B_E_values, 6);
        QuickMarcEditor.deleteField(5);
        QuickMarcEditor.checkContent(testData.tag852_B_E_values, 5);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkPermanentLocation(defaultLocation.name);
        HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
          testData.holdingsID = holdingsID;
        });
      },
    );
  });
});
