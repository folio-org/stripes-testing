import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INSTANCE_DATE_TYPES,
} from '../../../../support/constants';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C554634_MarcBibInstance_${getRandomPostfix()}`,
        date1: '',
        date2: '\\3 $',
        dateType: INSTANCE_DATE_TYPES.MULTIPLE,
        tag245: '245',
      };
      const createdRecordIDs = [];
      let user;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
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

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        createdRecordIDs.forEach((recordId) => {
          InventoryInstance.deleteInstanceViaApi(recordId);
        });
      });

      it(
        'C554634 Derive MARC bib with "Date 2" field in "008" filled by value with special characters (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C554634'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkDerivePaneheader();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, `${testData.instanceTitle} DRV`);

          QuickMarcEditor.update008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            testData.date1,
          );
          QuickMarcEditor.update008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            testData.date2,
          );
          QuickMarcEditor.verify008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            testData.date1,
          );
          QuickMarcEditor.verify008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            testData.date2,
          );

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyAfterDerivedMarcBibSave();
          InstanceRecordView.verifyInstanceIsOpened(`${testData.instanceTitle} DRV`);
          InstanceRecordView.verifyDates(
            undefined,
            testData.date2.replace('\\', ' '),
            testData.dateType,
          );
          InventoryInstance.getId().then((id) => createdRecordIDs.push(id));
        },
      );
    });
  });
});
