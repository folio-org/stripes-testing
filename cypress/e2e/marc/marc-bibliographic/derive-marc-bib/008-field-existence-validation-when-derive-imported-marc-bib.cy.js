import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_008_FIELD_CONF_DROPDOWN,
  INVENTORY_008_FIELD_FEST_DROPDOWN,
  INVENTORY_008_FIELD_INDX_DROPDOWN,
  INVENTORY_008_FIELD_LITF_DROPDOWN,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySteps from '../../../../support/fragments/inventory/inventorySteps';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag245Value: `Derived_C387452_${getRandomPostfix()}`,
        createdRecordIDs: [],
        tag008: '008',
        tag008RowIndex: 3,
        tag00: '00',
        expected008BoxesSets: [
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.ILLS,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.AUDN,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FORM,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONT,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.GPUB,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.BIOG,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.MREC,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SRCE,
        ],
        calloutMessage: 'Creating record may take several seconds.',
        errorCalloutMessage: 'Field 008 is required.',
        initial008EnteredValue: DateTools.getCurrentDateYYMMDD(),
      };
      const field008DropdownValues = [
        {
          dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
          option: INVENTORY_008_FIELD_DTST_DROPDOWN.M,
        },
        {
          dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
          option: INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
        },
        {
          dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
          option: INVENTORY_008_FIELD_FEST_DROPDOWN.ONE,
        },
        {
          dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
          option: INVENTORY_008_FIELD_INDX_DROPDOWN.ONE,
        },
        {
          dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
          option: INVENTORY_008_FIELD_LITF_DROPDOWN.I,
        },
      ];
      const marcFile = {
        marc: 'marcBibFileForC387452.mrc',
        fileName: `C387452 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      };

      before('Creating user and data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        });
      });

      it(
        'C387452 "008" field existence validation when derive imported "MARC bib" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C387452'] },
        () => {
          cy.visit(`${TopMenu.inventoryPath}/view/${testData.createdRecordIDs[0]}`);
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkFieldAbsense(testData.tag008);
          QuickMarcEditor.pressCancel();
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateExistingField('245', testData.tag245Value);
          QuickMarcEditor.checkFieldAbsense(testData.tag008);
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.addNewField(testData.tag008, '', testData.tag008RowIndex);
          QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets);
          QuickMarcEditor.updateExistingTagValue(4, testData.tag00);
          QuickMarcEditor.verifyTagValue(4, testData.tag00);
          QuickMarcEditor.checkContent('', 4);
          QuickMarcEditor.checkDeleteButtonExist(4);
          QuickMarcEditor.updateExistingTagValue(4, testData.tag008);
          field008DropdownValues.forEach((field008DropdownValue) => {
            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tag008,
              field008DropdownValue.dropdownLabel,
              field008DropdownValue.option,
            );
            cy.wait(500);
          });
          QuickMarcEditor.saveAndCloseWithValidationWarnings();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkContentByTag('245', `$a ${testData.tag245Value}`);
          QuickMarcEditor.check008FieldContent();
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(testData.createdRecordIDs).then(() => {
            cy.getAdminToken();
            InventorySteps.verifyHiddenFieldValueIn008(
              testData.createdRecordIDs[1],
              'Entered',
              DateTools.getCurrentDateYYMMDD(),
            );
          });
        },
      );
    });
  });
});
