import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INSTANCE_DATE_TYPES,
} from '../../../../support/constants';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C554633_MarcBibInstance_${getRandomPostfix()}`,
        tag245: '245',
        tag008: '008',
        dateTypeOption: INVENTORY_008_FIELD_DTST_DROPDOWN.K,
        dateTypeText: INSTANCE_DATE_TYPES.RANGE,
        dateLengthError: (dateNumber) => `Fail: Invalid Date ${dateNumber} field length, must be 4 characters`,
      };
      const datesData = [
        { date1: '1999u', date2: '20b27', errors: [], close: false },
        {
          date1: '1',
          date2: '9',
          errors: [testData.dateLengthError(1), testData.dateLengthError(2)],
          close: false,
        },
        { date1: '12', date2: '199u', errors: [testData.dateLengthError(1)], close: true },
        { date1: '12b', date2: '199u', errors: [testData.dateLengthError(1)], close: true },
        { date1: '12b6', date2: '19', errors: [testData.dateLengthError(2)], close: true },
        { date1: '12b6', date2: '199', errors: [testData.dateLengthError(2)], close: true },
        { date1: '12b6', date2: '199u', errors: [], close: true },
      ];
      const createdRecordIDs = [];
      let user;

      function checkDateFields(date1, date2) {
        QuickMarcEditor.verify008TextFields(
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
          date1.slice(0, 4),
        );
        QuickMarcEditor.verify008TextFields(
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
          date2.slice(0, 4),
        );
      }

      function fillDateFields(date1, date2) {
        QuickMarcEditor.update008TextFields(
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
          date1,
          true,
        );
        QuickMarcEditor.update008TextFields(
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
          date2,
          true,
        );
        checkDateFields(date1, date2);
      }

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            createdRecordIDs.push(instanceId);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        createdRecordIDs.forEach((recordId) => {
          InventoryInstance.deleteInstanceViaApi(recordId);
        });
      });

      it(
        'C554633 Cannot update MARC bib with more or less than 4 characters in "Date 1" and "Date 2" fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C554633'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle}`);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 1);
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            testData.dateTypeOption,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            testData.dateTypeOption,
          );

          datesData.forEach((dateData) => {
            fillDateFields(dateData.date1, dateData.date2);
            if (dateData.errors.length) {
              if (dateData.close) {
                QuickMarcEditor.pressSaveAndCloseButton();
              } else {
                QuickMarcEditor.clickSaveAndKeepEditingButton();
              }
              dateData.errors.forEach((error) => {
                QuickMarcEditor.checkErrorMessage(3, error);
              });
              QuickMarcEditor.verifyValidationCallout(0, dateData.errors.length);
              QuickMarcEditor.closeAllCallouts();
            } else if (dateData.close) {
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
              InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
              InstanceRecordView.verifyDates(dateData.date1, dateData.date2, testData.dateTypeText);
            } else {
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              QuickMarcEditor.checkAfterSaveAndKeepEditing();
              checkDateFields(dateData.date1, dateData.date2);
              cy.wait(2000);
            }
          });
        },
      );
    });
  });
});
