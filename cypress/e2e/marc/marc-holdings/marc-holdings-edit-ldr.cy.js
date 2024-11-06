import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_TYPE_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      tagLDR: 'LDR',
      tag852: '852',
    };
    const LDRDropdownOptionSets = [
      {
        name: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
        options: Object.values(MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN),
      },
      {
        name: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
        options: Object.values(MARC_HOLDING_LDR_FIELD_TYPE_DROPDOWN),
      },
      {
        name: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ELVL,
        options: Object.values(MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN),
      },
      {
        name: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ITEM,
        options: Object.values(MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN),
      },
    ];

    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcC357063.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const recordIDs = [];

    before('Creating user, data', () => {
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            recordIDs.push(record[marcFile.propertyName].id);
          });
        });

        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.searchByTitle(recordIDs[0]);
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
          },
        );
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      cy.deleteHoldingRecordViaApi(recordIDs[1]);
      InventoryInstance.deleteInstanceViaApi(recordIDs[0]);
    });

    it(
      'C357063 Verify "LDR" validation rules with valid data for positions 05, 06 ,17, 18 when editing record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C357063'] },
      () => {
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();
        for (let i = 0; i < Object.values(MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN).length; i++) {
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.verifyBoxLabelsInLDRFieldInMarcHoldingRecord();

          QuickMarcEditor.verifyMarcHoldingLDRDropdownsHoverTexts();

          LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
            LDRDropdownOptionSet.options.forEach((dropdownOption) => {
              QuickMarcEditor.verifyFieldsDropdownOption(
                testData.tagLDR,
                LDRDropdownOptionSet.name,
                dropdownOption,
              );
            });
          });

          LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tagLDR,
              LDRDropdownOptionSet.name,
              LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
            );
          });
          LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
            QuickMarcEditor.verifyDropdownOptionChecked(
              testData.tagLDR,
              LDRDropdownOptionSet.name,
              LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
            );
          });
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.checkHoldingRecordViewOpened();
        }
      },
    );
  });
});
