import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES,
} from '../../../support/constants';
import FileManager from '../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tagLdr: 'LDR',
        tag008: '008',
        tag852: '852',
        tag866: '866',
        marcBibTitle: `AT_C387479_MarcBibInstance_${randomPostfix}`,
        tag008RowIndex: 4,
        holdingsHridPlaceholder: 'in00000000000',
        holdingsLocationPlaceholder: 'LOCCODE',
        editedHoldingsFileNameA: `editedHoldingsFileC387479_A.${randomPostfix}.mrc`,
        editedHoldingsFileNameB: `editedHoldingsFileC387479_B.${randomPostfix}.mrc`,
        tag866ContentA: '$8 0 $a Too few 008 positions',
        tag866ContentB: '$8 0 $a Too many 008 positions',
        tag008BoxToEdit: 'Lang',
        langValue: 'eng',
        ldrItemDropDown: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ITEM,
        itemValue: MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN.I,
      };
      const holdingsFileA = {
        marc: 'marcHoldingsFileC387479_1.mrc',
        fileName: `testMarcFile.C387479A.${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      };
      const holdingsFileB = {
        marc: 'marcHoldingsFileC387479_2.mrc',
        fileName: `testMarcFile.C387479B.${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      };

      let recordId;
      let user;
      let location;
      const holdingsIds = [];
      let instanceHrid;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({
            limit: 2,
            query: '(name<>"*autotest*" and name<>"AT_*" and name<>"*auto*")',
          }).then((loc) => {
            location = loc;
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
              recordId = instanceId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                instanceHrid = instanceData.hrid;
              });
            });
          });
        })
          .then(() => {
            DataImport.editMarcFile(
              holdingsFileA.marc,
              testData.editedHoldingsFileNameA,
              [testData.holdingsHridPlaceholder, testData.holdingsLocationPlaceholder],
              [instanceHrid, location.code],
            );
            DataImport.editMarcFile(
              holdingsFileB.marc,
              testData.editedHoldingsFileNameB,
              [testData.holdingsHridPlaceholder, testData.holdingsLocationPlaceholder],
              [instanceHrid, location.code],
            );
          })
          .then(() => {
            DataImport.uploadFileViaApi(
              testData.editedHoldingsFileNameA,
              holdingsFileA.fileName,
              holdingsFileA.jobProfileToRun,
            ).then((response) => {
              holdingsIds.push(response[0].holding.id);
            });
          })
          .then(() => {
            DataImport.uploadFileViaApi(
              testData.editedHoldingsFileNameB,
              holdingsFileB.fileName,
              holdingsFileB.jobProfileToRun,
            ).then((response) => {
              holdingsIds.push(response[0].holding.id);
            });
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

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
        FileManager.deleteFile(`cypress/fixtures/${testData.editedHoldingsFileNameA}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.editedHoldingsFileNameB}`);
      });

      it(
        'C387479 User can edit imported "MARC Holdings" file without required number (32) of "008" positions (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C387479'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingViewByID(holdingsIds[0]);
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.checkContentByTag(testData.tag866, testData.tag866ContentA);

          QuickMarcEditor.updateExistingField(testData.tag866, `${testData.tag866ContentA} UPD`);
          QuickMarcEditor.checkContentByTag(testData.tag866, `${testData.tag866ContentA} UPD`);
          QuickMarcEditor.update008TextFields(testData.tag008BoxToEdit, testData.langValue);
          QuickMarcEditor.verify008TextFields(testData.tag008BoxToEdit, testData.langValue);
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tagLdr,
            testData.ldrItemDropDown,
            testData.itemValue,
          );
          QuickMarcEditor.verifyFieldsDropdownOption(
            testData.tagLdr,
            testData.ldrItemDropDown,
            testData.itemValue,
          );
          QuickMarcEditor.pressSaveAndClose();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.close();
          InventoryInstance.waitInstanceRecordViewOpened();

          InventoryInstance.openHoldingViewByID(holdingsIds[1]);
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.checkContentByTag(testData.tag866, testData.tag866ContentB);

          QuickMarcEditor.updateExistingField(testData.tag866, `${testData.tag866ContentB} UPD`);
          QuickMarcEditor.checkContentByTag(testData.tag866, `${testData.tag866ContentB} UPD`);
          QuickMarcEditor.update008TextFields(testData.tag008BoxToEdit, testData.langValue);
          QuickMarcEditor.verify008TextFields(testData.tag008BoxToEdit, testData.langValue);
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tagLdr,
            testData.ldrItemDropDown,
            testData.itemValue,
          );
          QuickMarcEditor.verifyFieldsDropdownOption(
            testData.tagLdr,
            testData.ldrItemDropDown,
            testData.itemValue,
          );
          QuickMarcEditor.clickSaveAndKeepEditing();
        },
      );
    });
  });
});
