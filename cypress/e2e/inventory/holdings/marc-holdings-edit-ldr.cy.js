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
import { JOB_STATUS_NAMES } from '../../../support/constants';
import { randomizeArray } from '../../../support/utils/arrays';

describe('Create holding records with MARC source', () => {
  const testData = {
    tagLDR: 'LDR',
    tag852: '852',
    validLDR05Values: randomizeArray(['c', 'd', 'n', 'c', 'd', 'n']),
    validLDR06Values: randomizeArray(['u', 'v', 'x', 'y', 'u', 'v', 'x', 'y']),
    validLDR17Values: randomizeArray(['1', '2', '3', '4', '5', 'm', 'u', 'z']),
    validLDR18Values: randomizeArray(['i', 'n', '\\', ' ', 'i', 'n', '\\', ' ']),
  };

  const marcFile = {
    marc: 'oneMarcBib.mrc',
    fileName: `testMarcC357063.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  const recordIDs = [];

  before('Creating user, data', () => {
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiInventoryViewCreateEditHoldings.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          recordIDs.push(link.split('/')[5]);
          cy.visit(TopMenu.inventoryPath).then(() => {
            InventoryInstance.searchByTitle(recordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.goToMarcHoldingRecordAdding();
            QuickMarcEditor.updateExistingField(
              testData.tag852,
              QuickMarcEditor.getExistingLocation(),
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveHoldings();
            HoldingsRecordView.checkHoldingRecordViewOpened();
            HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
              recordIDs.push(holdingsID);
              cy.login(createdUserProperties.username, createdUserProperties.password, {
                path: `${TopMenu.inventoryPath}/view/${recordIDs[0]}/${recordIDs[1]}`,
                waiter: HoldingsRecordView.checkHoldingRecordViewOpened,
              });
            });
          });
        });
      });
    });
  });

  after('Deleting created user, data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    cy.deleteHoldingRecordViaApi(recordIDs[1]);
    InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
  });

  it(
    'C357063 Verify "LDR" validation rules with valid data for positions 05, 06 ,17, 18 when editing record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      HoldingsRecordView.close();
      InventoryInstance.openHoldingView();
      for (let i = 0; i < testData.validLDR05Values.length; i++) {
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.getRegularTagContent(testData.tagLDR).then((content) => {
          const updatedLDRvalue = `${content.substring(0, 5)}${testData.validLDR05Values[i]}${
            testData.validLDR06Values[i]
          }${content.substring(7, 17)}${testData.validLDR17Values[i]}${
            testData.validLDR18Values[i]
          }${content.substring(19)}`;
          QuickMarcEditor.updateExistingField(testData.tagLDR, updatedLDRvalue);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.checkHoldingRecordViewOpened();
        });
      }
    },
  );
});
