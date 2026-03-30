import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';
import { including } from '../../../../interactors';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tagLdrSource: 'LEADER',
        tag868: '868',
        marcBibTitle: `AT_C358155_MarcBibInstance_${randomPostfix}`,
        updatedTag868Content: '$a Updated Field868',
      };
      const originalLdrParts = ['78a', '94500'];
      const newLdrParts = ['cy  a', ' 4500'];
      const marcFile = {
        marc: 'marcHoldingsFileForC358155.mrc',
        editedFileName: `updatedMarcHoldingsC358155_${randomPostfix}.mrc`,
        fileName: `testMarcHoldingsC358155_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      };

      let recordId;
      let user;
      let instanceHrid;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({
            limit: 1,
            query: '(name<>"*autotest*" and name<>"AT_*" and name<>"*auto*")',
          }).then((location) => {
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
              recordId = instanceId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                instanceHrid = instanceData.hrid;

                // edit marc file adding instance hrid
                DataImport.editMarcFile(
                  marcFile.marc,
                  marcFile.editedFileName,
                  ['in00000000000', 'LCODE'],
                  [instanceHrid, location.code],
                );
              });
            });
          });
        })
          .then(() => {
            DataImport.uploadFileViaApi(
              marcFile.editedFileName,
              marcFile.fileName,
              marcFile.jobProfileToRun,
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
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
        FileManager.deleteFile(`cypress/fixtures/${marcFile.editedFileName}`);
      });

      it(
        'C358155 Verify that invalid values at 07, 08, 19 positions of "LDR" field change to valid when user edit "MARC Holdings" record. (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C358155'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyValuesInLdrNonEditableBoxesHoldings({
            positions7to16BoxValues: including(originalLdrParts[0]),
            positions19to23BoxValues: including(originalLdrParts[1]),
          });

          QuickMarcEditor.updateExistingField(testData.tag868, testData.updatedTag868Content);
          QuickMarcEditor.checkContentByTag(testData.tag868, testData.updatedTag868Content);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.viewSource();
          originalLdrParts.forEach((oldPart) => {
            InventoryViewSource.checkRowExistsWithTagAndValue(
              testData.tagLdrSource,
              oldPart,
              false,
            );
          });
          newLdrParts.forEach((newPart) => {
            InventoryViewSource.checkRowExistsWithTagAndValue(testData.tagLdrSource, newPart, true);
          });
        },
      );
    });
  });
});
