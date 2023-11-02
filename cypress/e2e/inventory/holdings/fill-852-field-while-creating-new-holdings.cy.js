import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

describe('MARC › MARC Holdings', () => {
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const testData = {
    tag851: '851',
    tag852: '852',
    tag851value: '$a subfield with any value',
  };
  const marcFile = {
    marc: 'oneMarcBib.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  let defaultLocation;
  let user;

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
    ]).then((createdUserProperties) => {
      ServicePoints.createViaApi(servicePoint);
      defaultLocation = Location.getDefaultLocation(servicePoint.id);
      testData.tag852_B_value = `$b ${defaultLocation.code}`;
      testData.tag852_B_E_values = `$b ${defaultLocation.code} $e Test`;
      Location.createViaApi(defaultLocation);
      user = createdUserProperties;
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          testData.recordID = link.split('/')[5];
        });
      });
    });
  });

  after('Deleting created user, data', () => {
    cy.deleteHoldingRecordViaApi(testData.holdingsID);
    InventoryInstance.deleteInstanceViaApi(testData.recordID);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C358990 Verify user can fill in "852 $b" field by typing text when create new "MARC Holdings" record (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.searchByTitle(testData.recordID);
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
