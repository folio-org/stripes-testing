import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_STATUS_DROPDOWN,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
  INVENTORY_LDR_FIELD_CTRL_DROPDOWN,
  INVENTORY_LDR_FIELD_DESC_DROPDOWN,
  INVENTORY_LDR_FIELD_MULTILVL_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_008_FIELD_CONF_DROPDOWN,
  INVENTORY_008_FIELD_FEST_DROPDOWN,
  INVENTORY_008_FIELD_INDX_DROPDOWN,
  INVENTORY_008_FIELD_LITF_DROPDOWN,
} from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C357569_MarcBibInstance_${randomPostfix}`,
        tagLdr: 'LDR',
        tag008: '008',
        tag245: '245',
        ldrPositions: ['05', '07', '08', '18', '19'],
        ldrDropdowns: {
          status: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          blvl: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
          ctrl: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.CTRL,
          desc: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.DESC,
          multilvl: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.MULTILVL,
        },
        validValues: {
          status: INVENTORY_LDR_FIELD_STATUS_DROPDOWN.N,
          blvl: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
          ctrl: INVENTORY_LDR_FIELD_CTRL_DROPDOWN.A,
          desc: INVENTORY_LDR_FIELD_DESC_DROPDOWN.U,
          multilvl: INVENTORY_LDR_FIELD_MULTILVL_DROPDOWN['\\'],
        },
        invalid008Dropdowns: [
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
        ],
        valid008Values: [
          INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
          INVENTORY_008_FIELD_FEST_DROPDOWN.ONE,
          INVENTORY_008_FIELD_INDX_DROPDOWN.ONE,
          INVENTORY_008_FIELD_LITF_DROPDOWN.I,
        ],
        ldrValuesToCheckInSource: ['naa', 'u '],
      };

      const updatedTitle = `${testData.instanceTitle}_upd`;

      const marcFile = {
        marc: 'marcBibFileC357569.mrc',
        fileName: `C357569.testMarcFile.${getRandomPostfix()}.mrc`,
      };

      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

      const createdInstanceIds = [];

      before(() => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C357569_MarcBibInstance');
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
            (response) => {
              createdInstanceIds.push(response[0].instance.id);

              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
            },
          );
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      });

      it(
        'C357569 Verify "LDR" validation rules with invalid data for editable positions "05", "07", "08", "18", "19" when deriving record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C357569'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceIds[0]);
          InventoryInstances.selectInstanceById(createdInstanceIds[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();

          Object.values(testData.ldrDropdowns).forEach((dropdownName) => {
            QuickMarcEditor.checkDropdownMarkedAsInvalid(testData.tagLdr, dropdownName);
          });

          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${updatedTitle}`);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyInvalidLDRValueError(testData.ldrPositions);

          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tagLdr,
            testData.ldrDropdowns.status,
            testData.validValues.status,
          );
          QuickMarcEditor.verifyFieldsDropdownOption(
            testData.tagLdr,
            testData.ldrDropdowns.status,
            testData.validValues.status,
          );

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyInvalidLDRValueError(testData.ldrPositions.slice(1));

          Object.entries(testData.ldrDropdowns)
            .slice(1)
            .forEach(([key, dropdownName]) => {
              QuickMarcEditor.selectFieldsDropdownOption(
                testData.tagLdr,
                dropdownName,
                testData.validValues[key],
              );
              QuickMarcEditor.verifyFieldsDropdownOption(
                testData.tagLdr,
                dropdownName,
                testData.validValues[key],
              );
            });
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tagLdr, false);
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008);

          testData.invalid008Dropdowns.forEach((dropdownName, index) => {
            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tag008,
              dropdownName,
              testData.valid008Values[index],
            );
          });
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008, false);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();

          InventoryInstance.viewSource();
          testData.ldrValuesToCheckInSource.forEach((value) => {
            InventoryViewSource.contains(value);
          });
        },
      );
    });
  });
});
