import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_LDR_FIELD_DESC_DROPDOWN,
  INVENTORY_LDR_FIELD_STATUS_DROPDOWN,
  INVENTORY_LDR_FIELD_CTRL_DROPDOWN,
  INVENTORY_LDR_FIELD_MULTILVL_DROPDOWN,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
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
      let user;
      let instanceID;
      const field008BoxesAbsent = ['ELvl', 'Desc'];
      const elvlBoxValues = ['P', 'n', '8', '%'];
      const tagLDR = 'LDR';
      const marcFile = {
        marc: 'marcBibFileForC380397.mrc',
        fileName: `testMarcFileC380397${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      const statusDropdownOptions = Object.values(INVENTORY_LDR_FIELD_STATUS_DROPDOWN);
      const ctrlDropdownOptions = Object.values(INVENTORY_LDR_FIELD_CTRL_DROPDOWN);
      const descDropdownOptions = Object.values(INVENTORY_LDR_FIELD_DESC_DROPDOWN);
      const multilvlDropdownOptions = Object.values(INVENTORY_LDR_FIELD_MULTILVL_DROPDOWN);
      const LDRDropdownOptionSets = [
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          options: statusDropdownOptions,
        },
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.CTRL,
          options: ctrlDropdownOptions,
        },
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.DESC,
          options: descDropdownOptions,
        },
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.MULTILVL,
          options: multilvlDropdownOptions,
        },
      ];

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
        });
      });

      after('Deleting created users, Instances', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userId);
          InventoryInstance.deleteInstanceViaApi(instanceID);
        });
      });

      it(
        'C380397 Verify "LDR" validation rules with valid data for positions 05, 08, 17, 18, 19 when editing record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          InventoryInstances.searchByTitle(instanceID);
          InventoryInstances.selectInstance();
          InventoryInstance.waitInventoryLoading();

          for (let i = 0; i < descDropdownOptions.length; i++) {
            InventoryInstance.editMarcBibliographicRecord();

            QuickMarcEditor.check008FieldBoxesAbsent(...field008BoxesAbsent);

            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              LDRDropdownOptionSet.options.forEach((dropdownOption) => {
                QuickMarcEditor.verifyFieldsDropdownOption(
                  tagLDR,
                  LDRDropdownOptionSet.name,
                  dropdownOption,
                );
              });
            });

            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              QuickMarcEditor.selectFieldsDropdownOption(
                tagLDR,
                LDRDropdownOptionSet.name,
                LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
              );
            });
            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              QuickMarcEditor.verifyDropdownOptionChecked(
                tagLDR,
                LDRDropdownOptionSet.name,
                LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
              );
            });
            QuickMarcEditor.fillInElvlBoxInLDRField(elvlBoxValues[i % elvlBoxValues.length]);
            QuickMarcEditor.verifyValueInElvlBoxInLDRField(elvlBoxValues[i % elvlBoxValues.length]);

            QuickMarcEditor.pressSaveAndClose();
            InventoryInstance.waitInventoryLoading();
          }
        },
      );
    });
  });
});
