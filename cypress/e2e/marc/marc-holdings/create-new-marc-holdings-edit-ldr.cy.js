import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_TYPE_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES,
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

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      tag852: '852',
      existingLocation: QuickMarcEditor.getExistingLocation(),
    };
    const LDR = 'LDR';
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
      fileName: `testMarcFileC357571.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const holdingsIDs = [];
    let instanceID;

    before(() => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                instanceID = record[marcFile.propertyName].id;
              });
            });
          },
        );

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      holdingsIDs.forEach((id) => {
        cy.deleteHoldingRecordViaApi(id);
      });
      InventoryInstance.deleteInstanceViaApi(instanceID);
    });

    it(
      'C357571 Verify "LDR" validation rules with valid data for positions 05, 06 ,17, 18 when creating record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C357571'] },
      () => {
        InventoryInstances.searchByTitle(instanceID);
        InventoryInstances.selectInstance();
        for (let i = 0; i < Object.values(MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN).length; i++) {
          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.updateExistingField(testData.tag852, testData.existingLocation);
          QuickMarcEditor.checkContent(testData.existingLocation, 5);

          QuickMarcEditor.verifyInitialLDRFieldsValuesInMarcHoldingRecord();
          QuickMarcEditor.verifyMarcHoldingLDRDropdownsHoverTexts();

          LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
            LDRDropdownOptionSet.options.forEach((dropdownOption) => {
              QuickMarcEditor.verifyFieldsDropdownOption(
                LDR,
                LDRDropdownOptionSet.name,
                dropdownOption,
              );
            });
          });

          LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
            QuickMarcEditor.selectFieldsDropdownOption(
              LDR,
              LDRDropdownOptionSet.name,
              LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
            );
          });

          LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
            QuickMarcEditor.verifyDropdownOptionChecked(
              LDR,
              LDRDropdownOptionSet.name,
              LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
            );
          });

          QuickMarcEditor.verifySaveAndCloseButtonEnabled();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
            holdingsIDs.push(holdingsID);
            HoldingsRecordView.close();
            InventoryInstance.waitLoading();
          });
        }
      },
    );
  });
});
