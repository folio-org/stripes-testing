import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_STATUS_DROPDOWN,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
  INVENTORY_LDR_FIELD_CTRL_DROPDOWN,
  INVENTORY_LDR_FIELD_DESC_DROPDOWN,
  INVENTORY_LDR_FIELD_MULTILVL_DROPDOWN,
  INVENTORY_008_FIELD_REGL_DROPDOWN,
  INVENTORY_008_FIELD_S_L_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const marcFile = {
        marc: 'marcBibFileForC357567.mrc',
        fileName: `testMarcFileC357567${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      const tagLDR = 'LDR';
      const tag008 = '008';
      const invalidLDRDropdownsValues = [
        INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
        INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
        INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.CTRL,
        INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.MULTILVL,
      ];
      const fieldLDRDropdownsOptionsSet = [
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
          option: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.S,
        },
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.CTRL,
          option: INVENTORY_LDR_FIELD_CTRL_DROPDOWN['\\'],
        },
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.DESC,
          option: INVENTORY_LDR_FIELD_DESC_DROPDOWN.A,
        },
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.MULTILVL,
          option: INVENTORY_LDR_FIELD_MULTILVL_DROPDOWN.C,
        },
      ];
      const field008DropdownsOptionsSet = [
        {
          name: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.REGL,
          option: INVENTORY_008_FIELD_REGL_DROPDOWN.R,
        },
        {
          name: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SL,
          option: INVENTORY_008_FIELD_S_L_DROPDOWN[0],
        },
      ];
      const errorMessageFirstSave =
        'Record cannot be saved. Please enter a valid Leader 05, Leader 07, Leader 08, Leader 18 and Leader 19. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html';
      const errorMessageSecondSave =
        'Record cannot be saved. Please enter a valid Leader 07, Leader 08, Leader 18 and Leader 19. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html';
      let instanceID;
      let user;

      before('Create user and data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            instanceID = record[marcFile.propertyName].id;
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.searchByTitle(instanceID);
          InventoryInstances.selectInstance();
          InventoryInstance.waitInventoryLoading();
        });
      });

      after('Deleting created users, Instances', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userId);
          InventoryInstance.deleteInstanceViaApi(instanceID);
        });
      });

      it(
        'C357567 Verify "LDR" validation rules with invalid data for editable positions "05", "06", "07", "08", "18", "19" when editing record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C357567'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();

          invalidLDRDropdownsValues.forEach((invalidLDRDropdownValue) => {
            QuickMarcEditor.verifyDropdownValueOfLDRIsValid(invalidLDRDropdownValue, false);
          });

          QuickMarcEditor.updateExistingField(
            '245',
            '$a UPDATED Invalid LDR editable positions The Journal of ecclesiastical history.',
          );
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(0, errorMessageFirstSave);

          Object.values(INVENTORY_LDR_FIELD_STATUS_DROPDOWN).forEach((dropdownOption) => {
            QuickMarcEditor.verifyFieldsDropdownOption(
              tagLDR,
              INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
              dropdownOption,
            );
          });
          QuickMarcEditor.verifyFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            'b - invalid value',
          );

          QuickMarcEditor.selectFieldsDropdownOption(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            INVENTORY_LDR_FIELD_STATUS_DROPDOWN.C,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            INVENTORY_LDR_FIELD_STATUS_DROPDOWN.C,
          );

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(0, errorMessageSecondSave);

          fieldLDRDropdownsOptionsSet.forEach((LDRFieldDropdownsOption) => {
            QuickMarcEditor.selectFieldsDropdownOption(
              tagLDR,
              LDRFieldDropdownsOption.name,
              LDRFieldDropdownsOption.option,
            );
            QuickMarcEditor.verifyDropdownOptionChecked(
              tagLDR,
              LDRFieldDropdownsOption.name,
              LDRFieldDropdownsOption.option,
            );
          });

          field008DropdownsOptionsSet.forEach((field008DropdownOption) => {
            QuickMarcEditor.selectFieldsDropdownOption(
              tag008,
              field008DropdownOption.name,
              field008DropdownOption.option,
            );
            QuickMarcEditor.verifyDropdownOptionChecked(
              tag008,
              field008DropdownOption.name,
              field008DropdownOption.option,
            );
          });
          QuickMarcEditor.clickSaveAndKeepEditing();
          Object.values(INVENTORY_LDR_FIELD_DROPDOWNS_NAMES).forEach((dropdownName) => {
            QuickMarcEditor.verifyDropdownValueOfLDRIsValid(dropdownName);
          });
        },
      );
    });
  });
});
