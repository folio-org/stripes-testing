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
import Parallelization from '../../../support/dictionary/parallelization';
import FileManager from '../../../support/utils/fileManager';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('MARC -> MARC Holdings', () => {
  const testData = {
    tag852: '852',
    editedHoldingsFileName: 'C389500EditedHoldingsFile.mrc',
    holdingsHRIDPlaceholders: [
      'oo10000000000',
      'oo20000000000',
      'oo30000000000',
      'oo40000000000',
      'oo50000000000',
      'oo60000000000',
    ],
  };

  const callNumberTypes = {
    typeNLM: 'National Library of Medicine classification',
    typeDewey: 'Dewey Decimal classification',
    typeNone: '-',
    typeSuDoc: 'Superintendent of Documents classification',
    typeTitle: 'Title',
    typeShelved: 'Shelved separately',
    typeShelving: 'Shelving control number',
    typeOther: 'Other scheme',
    typeLC: 'Library of Congress classification',
    typeSubfield: 'Source specified in subfield $2',
  };

  const originalTypes = [
    callNumberTypes.typeLC,
    callNumberTypes.typeDewey,
    callNumberTypes.typeSuDoc,
    callNumberTypes.typeShelved,
    callNumberTypes.typeSubfield,
    callNumberTypes.typeNone,
  ];
  const updatedTypes = [
    callNumberTypes.typeNLM,
    callNumberTypes.typeNone,
    callNumberTypes.typeTitle,
    callNumberTypes.typeNone,
    callNumberTypes.typeOther,
    callNumberTypes.typeShelving,
  ];
  const originalIndicators = ['0', '1', '3', '6', '7', '9'];
  const updatedIndicators = ['2', 'd', '5', '\\', '8', '4'];

  const instanceFile = {
    marc: 'marcBibFileC389500.mrc',
    fileName: `testMarcFile.C389500.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  const holdingsFile = {
    marc: 'marcHoldingsFileC389500.mrc',
    fileName: `testMarcFile.C389500.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create Holdings and SRS MARC Holdings',
    numOfRecords: 6,
  };

  const recordIDs = [];

  before('Creating user, data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      Permissions.settingsDataImportEnabled.gui,
    ]).then((createdUserProperties) => {
      testData.createdUserProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(instanceFile.marc, instanceFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(instanceFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(instanceFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(instanceFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          recordIDs.push(link.split('/')[5]);
          cy.getInstanceHRID(recordIDs[0]).then((instanceHRID) => {
            DataImport.editMarcFile(
              holdingsFile.marc,
              testData.editedHoldingsFileName,
              testData.holdingsHRIDPlaceholders,
              [instanceHRID, instanceHRID, instanceHRID, instanceHRID, instanceHRID, instanceHRID],
            );
            cy.visit(TopMenu.dataImportPath);
            DataImport.waitLoading();
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(testData.editedHoldingsFileName, holdingsFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(holdingsFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(holdingsFile.fileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(holdingsFile.fileName);
            // additional wait for holdings list to load
            cy.wait(2000);
            for (let i = 0; i < holdingsFile.numOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((createdLink) => {
                recordIDs.push(createdLink.split('/')[6]);
              });
            }
          });
          cy.login(createdUserProperties.username, createdUserProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });
  });

  after('Deleting created user, data', () => {
    Users.deleteViaApi(testData.createdUserProperties.userId);
    recordIDs.forEach((id, index) => {
      if (index) cy.deleteHoldingRecordViaApi(id);
    });
    InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
    FileManager.deleteFile(`cypress/fixtures/${testData.editedHoldingsFileName}`);
  });

  it(
    'C389500 Verify that "Call number type" is correctly mapped after importing and editing. (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      InventoryInstance.searchByTitle(recordIDs[0]);
      for (let i = 0; i < holdingsFile.numOfRecords; i++) {
        InventoryInstance.openHoldingViewByID(recordIDs[i + 1]);
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkCallNumberType(originalTypes[i]);
        HoldingsRecordView.close();
        InventoryInstance.openHoldingViewByID(recordIDs[i + 1]);
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.verifyIndicatorValue(testData.tag852, originalIndicators[i]);
        QuickMarcEditor.updateIndicatorValue(testData.tag852, updatedIndicators[i]);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.checkCallNumberType(updatedTypes[i]);
        HoldingsRecordView.close();
      }
    },
  );
});
