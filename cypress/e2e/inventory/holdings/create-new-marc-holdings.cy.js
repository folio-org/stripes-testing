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

describe('Create holding records with MARC source', () => {
  const marcFile = {
    marc: 'oneMarcBib.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numOfRecords: 1,
  };

  const testData = {};
  const recordIDs = [];

  function getCurrentDateYYMMDD() {
    const padWithZero = value => String(value).padStart(2, '0');
    const initialCurrentDate = new Date();
    return `${initialCurrentDate.getFullYear().toString().substring(2)}${padWithZero(initialCurrentDate.getMonth() + 1)}${padWithZero(initialCurrentDate.getDate())}`;
  }

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then(link => {
          recordIDs.push(link.split('/')[5]);
        });
      });
    });
  });

  beforeEach('Login', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
  });

  after('Deleting created user, data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    cy.deleteHoldingRecordViaApi(recordIDs[1]);
    InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  it('C387450 "008" field existence validation when create new "MARC Holdings" (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire], retries: 1 }, () => {
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
    QuickMarcEditor.clearCertain008Boxes('AcqStatus', 'AcqMethod', 'Gen ret', 'Compl', 'Lend', 'Repro', 'Lang', 'Sep/comp');
    QuickMarcEditor.pressSaveAndClose();
    QuickMarcEditor.checkAfterSaveHoldings();
    HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
      HoldingsRecordView.editInQuickMarc();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.check008FieldsEmptyHoldings();
      InventorySteps.verifyHiddenFieldValueInHoldings008(holdingsID, 'Date Ent', getCurrentDateYYMMDD());
      recordIDs.push(holdingsID);
    });
  });
});
