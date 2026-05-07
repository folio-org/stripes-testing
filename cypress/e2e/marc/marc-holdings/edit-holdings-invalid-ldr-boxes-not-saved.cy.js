import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import FileManager from '../../../support/utils/fileManager';
import { including } from '../../../../interactors';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag868: '868',
        tagLdrSource: 'LEADER',
        marcBibTitle: `AT_C353984_MarcBibInstance_${randomPostfix}`,
        holdingsHridPlaceholder: 'in00000000000',
        holdingsLocationPlaceholder: 'LOCCODE',
        editedHoldingsFileName: `editedHoldingsFileC353984.${randomPostfix}.mrc`,
        tag868NewContent: '$a Updated by automation',
        invalidLDRValuesInEdit: ['\\\\a11', '\\1111'],
        validLDRValuesInView: ['a22', '4500'],
      };

      const holdingsFile = {
        marc: 'marcHoldingsForC353984.mrc',
        fileName: `testMarcFile.C353984.${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      };

      let instanceId;
      let user;
      let location;

      before('Create test data and login', () => {
        cy.getAdminToken();

        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*" and name<>"*auto*")' })
          .then((loc) => {
            location = loc;
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceRecordId) => {
              instanceId = instanceRecordId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                // Edit holdings file to replace placeholders with actual values
                DataImport.editMarcFile(
                  holdingsFile.marc,
                  testData.editedHoldingsFileName,
                  [testData.holdingsHridPlaceholder, testData.holdingsLocationPlaceholder],
                  [instanceData.hrid, location.code],
                );
              });
            });
          })
          .then(() => {
            // Import holdings file via Data Import
            DataImport.uploadFileViaApi(
              testData.editedHoldingsFileName,
              holdingsFile.fileName,
              holdingsFile.jobProfileToRun,
            );
          })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
        FileManager.deleteFile(`cypress/fixtures/${testData.editedHoldingsFileName}`);
      });

      it(
        'C353984 Verify that invalid values at 10, 11, 20-23 positions of "LDR" field change to valid when user edit "MARC Holdings" record. (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C353984'] },
        () => {
          // Steps 1-2: Navigate to holdings record
          InventoryInstances.searchByTitle(instanceId);
          InventoryInstances.selectInstanceById(instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.waitLoading();

          // Step 3: Edit in quickMARC and verify invalid LDR values
          cy.wait(2000);
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          // Verify invalid LDR values in edit mode (positions 10-11 and 20-23)
          QuickMarcEditor.verifyValuesInLdrNonEditableBoxesHoldings({
            positions7to16BoxValues: including(testData.invalidLDRValuesInEdit[0]),
            positions19to23BoxValues: testData.invalidLDRValuesInEdit[1],
          });

          // Step 4: Edit field 868
          QuickMarcEditor.updateExistingField(testData.tag868, testData.tag868NewContent);
          QuickMarcEditor.checkContentByTag(testData.tag868, testData.tag868NewContent);
          QuickMarcEditor.checkButtonsEnabled();

          // Step 5: Save & close
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();

          // Step 6-7: View source and verify valid LDR values
          HoldingsRecordView.viewSource();
          testData.validLDRValuesInView.forEach((validValue) => {
            InventoryViewSource.checkRowExistsWithTagAndValue(testData.tagLdrSource, validValue);
          });
        },
      );
    });
  });
});
