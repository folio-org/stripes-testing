import TopMenu from '../../../support/fragments/topMenu';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TestTypes from '../../../support/dictionary/testTypes';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../../support/dictionary/devTeams';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import DateTools from '../../../support/utils/dateTools';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';

describe('Create holding records with MARC source', () => {
  const testData = {
    tag852: '852',
    tag866: '866',
    tag866Value: 'Test',
  };
  const marcFiles = [
    {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
  ];

  let user;
  const recordIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
    ]).then((createdUserProperties) => {
      user = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(marcFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              recordIDs.push(link.split('/')[5]);
            });
          },
        );
      });
    });
  });

  beforeEach('Login', () => {
    cy.login(user.username, user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created user, data', () => {
    Users.deleteViaApi(user.userId);
    cy.deleteHoldingRecordViaApi(recordIDs[2]);
    cy.deleteHoldingRecordViaApi(recordIDs[3]);
    InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
    InventoryInstance.deleteInstanceViaApi(recordIDs[1]);
  });

  it(
    'C387450 "008" field existence validation when create new "MARC Holdings" (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire], retries: 1 },
    () => {
      InventoryInstance.searchByTitle(recordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.goToMarcHoldingRecordAdding();
      QuickMarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
      QuickMarcEditor.updateExistingTagValue(4, '00');
      QuickMarcEditor.checkDeleteButtonExist(4);
      QuickMarcEditor.deleteFieldAndCheck(4, '008');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkDelete008Callout();
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.updateExistingTagValue(4, '008');
      QuickMarcEditor.checkSubfieldsPresenceInTag008();
      QuickMarcEditor.clearCertain008Boxes(
        'AcqStatus',
        'AcqMethod',
        'Gen ret',
        'Compl',
        'Lend',
        'Repro',
        'Lang',
        'Sep/comp',
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveHoldings();
      HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
        // "Edit in quickMARC" option might not be active immediately after creating MARC Holdings
        // this option becomes active after reopening Holdings view window
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();

        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.check008FieldsEmptyHoldings();
        InventorySteps.verifyHiddenFieldValueIn008(
          holdingsID,
          'Date Ent',
          DateTools.getCurrentDateYYMMDD(),
        );
        recordIDs.push(holdingsID);
      });
    },
  );

  it(
    'C350646 Create a new MARC Holdings record for existing "Instance" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstances.searchBySource('MARC');
      InventoryInstance.searchByTitle(recordIDs[1]);
      InventoryInstance.checkExpectedMARCSource();
      InventoryInstance.goToMarcHoldingRecordAdding();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.updateExistingField(testData.tag852, QuickMarcEditor.getExistingLocation());
      QuickMarcEditor.addEmptyFields(5);
      QuickMarcEditor.updateExistingTagValue(6, testData.tag866);
      QuickMarcEditor.updateExistingField(testData.tag866, testData.tag866Value);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveHoldings();
      HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
        recordIDs.push(holdingsID);
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.viewSource();
        HoldingsRecordView.closeSourceView();
        InventoryInstance.verifyLastUpdatedDate();
        InventoryInstance.verifyRecordStatus(`Source: ${user.lastName}, ${user.firstName}`);
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkUserNameInHeader(user.firstName, user.lastName);
      });
    },
  );
});

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
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
        () => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then((link) => {
            testData.recordID = link.split('/')[5];
          });
        },
      );
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
    }
  );
});
