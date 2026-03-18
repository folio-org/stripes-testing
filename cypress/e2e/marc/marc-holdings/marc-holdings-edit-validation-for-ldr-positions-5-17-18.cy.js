import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES,
  MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tagLDR: 'LDR',
        tag868: '868',
        marcBibTitle: `AT_C357572_MarcBibInstance_${randomPostfix}`,
        updatedTag868Content: '$a Updated Field868',
      };
      const marcFile = {
        marc: 'marcHoldingsFileForC357572.mrc',
        editedFileName: `updatedMarcHoldingsC357572_${randomPostfix}.mrc`,
        fileName: `testMarcHoldingsC357572_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      };
      const invalidLDRDropdownsValues = [
        MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
        MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ELVL,
        MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ITEM,
      ];
      const statusDropdownValues = [
        'a - invalid value',
        ...Object.values(MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN),
      ];
      const errorMessageFirstSave =
        'Fail: Record cannot be saved. Please enter a valid Leader 05, Leader 17 and Leader 18. Valid values are listed at https://www.loc.gov/marc/holdings/hdleader.html';
      const errorMessageSecondSave =
        'Fail: Record cannot be saved. Please enter a valid Leader 17 and Leader 18. Valid values are listed at https://www.loc.gov/marc/holdings/hdleader.html';

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
              authRefresh: true,
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
        'C357572 Verify "LDR" validation rules with invalid data for positions 05, 17, 18 when editing record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C357572'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          invalidLDRDropdownsValues.forEach((invalidLDRDropdownValue) => {
            QuickMarcEditor.verifyDropdownValueOfLDRIsValid(invalidLDRDropdownValue, false);
          });

          QuickMarcEditor.updateExistingField(testData.tag868, testData.updatedTag868Content);
          QuickMarcEditor.checkContentByTag(testData.tag868, testData.updatedTag868Content);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(0, errorMessageFirstSave);

          statusDropdownValues.forEach((dropdownOption) => {
            QuickMarcEditor.verifyFieldsDropdownOption(
              testData.tagLDR,
              MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
              dropdownOption,
            );
          });

          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tagLDR,
            MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN.C,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tagLDR,
            MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN.C,
          );

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(0, errorMessageSecondSave);

          QuickMarcEditor.verifyInlineValidationErrorLink(
            0,
            errorMessageSecondSave.split('at ')[1],
          );

          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tagLDR,
            MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ELVL,
            MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN[1],
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tagLDR,
            MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ELVL,
            MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN[1],
          );

          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tagLDR,
            MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ITEM,
            MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN.I,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tagLDR,
            MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ITEM,
            MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN.I,
          );

          invalidLDRDropdownsValues.forEach((invalidLDRDropdownValue) => {
            QuickMarcEditor.verifyDropdownValueOfLDRIsValid(invalidLDRDropdownValue, true);
          });

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tagLDR,
            MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN.C,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tagLDR,
            MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ELVL,
            MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN[1],
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tagLDR,
            MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ITEM,
            MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN.I,
          );
          invalidLDRDropdownsValues.forEach((invalidLDRDropdownValue) => {
            QuickMarcEditor.verifyDropdownValueOfLDRIsValid(invalidLDRDropdownValue, true);
          });
        },
      );
    });
  });
});
