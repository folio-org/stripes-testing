import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_NAMES,
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
          'DtSt',
          'Date 1',
          'Date 2',
          'Ctry',
          'Ills',
          'Audn',
          'Form',
          'Cont',
          'GPub',
          'Conf',
          'Fest',
          'Indx',
          'LitF',
          'Biog',
          'Lang',
          'MRec',
          'Srce',
        ],
        calloutMessage: 'Creating record may take several seconds.',
        errorCalloutMessage: 'Record cannot be saved without 008 field',
        initial008EnteredValue: DateTools.getCurrentDateYYMMDD(),
      };
      const field008DropdownValues = [
        {
          dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_NAMES.DTST,
          option: INVENTORY_008_FIELD_DTST_DROPDOWN.M,
        },
        {
          dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_NAMES.CONF,
          option: INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
        },
        {
          dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_NAMES.FEST,
          option: INVENTORY_008_FIELD_FEST_DROPDOWN.ONE,
        },
        {
          dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_NAMES.INDX,
          option: INVENTORY_008_FIELD_INDX_DROPDOWN.ONE,
        },
        {
          dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_NAMES.LITF,
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
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.moduleDataImportEnabled.gui,
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
                  testData.createdRecordIDs.push(record[marcFile.propertyName].id);
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

      after('Deleting created user and data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        });
      });

      it(
        'C387452 "008" field existence validation when derive imported "MARC bib" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
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
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
          QuickMarcEditor.closeCallout();
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
          QuickMarcEditor.pressSaveAndClose();
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
