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
        instanceTitle: `AT_C554632_MarcBibInstance_${getRandomPostfix()}`,
        tag245: '245',
        tag008: '008',
        dateTypeOption: INVENTORY_008_FIELD_DTST_DROPDOWN.P,
        dateTypeText: INSTANCE_DATE_TYPES.DISTRIBUTION,
        date1: '0982',
        date2: '',
      };
      const createdRecordIDs = [];
      let user;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            createdRecordIDs.push(instanceId);
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
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
        'C554632 Edit MARC bib with selected "Date type" and field "Date 1" filled only (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C554632'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle}`);

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
          QuickMarcEditor.update008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            testData.date1,
          );
          QuickMarcEditor.verify008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            testData.date1,
          );
          QuickMarcEditor.update008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            testData.date2,
          );
          QuickMarcEditor.verify008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            testData.date2,
          );

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
          InstanceRecordView.verifyDates(testData.date1, undefined, testData.dateTypeText);
        },
      );
    });
  });
});
