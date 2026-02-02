import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C503015_MarcBibInstance_${getRandomPostfix()}`,
        tag245: '245',
        tag008: '008',
        valid245IndicatorValue: '1',
        boxesWithErrors: [
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
        ],
        date2Box: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
        tag008ErrorText: (boxName) => `Fail: Record cannot be saved. Field 008 contains an invalid value in "${boxName}" position.`,
        invalidDate2: '189',
        date2ErrorText: 'Fail: Invalid Date 2 field length, must be 4 characters.',
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
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
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
        'C503015 Cannot derive "MARC bib" record with not valid value in "008" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C503015'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkDerivePaneheader();
          testData.boxesWithErrors.forEach((boxName) => {
            QuickMarcEditor.checkDropdownMarkedAsInvalid(testData.tag008, boxName);
          });

          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.valid245IndicatorValue, 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.valid245IndicatorValue, 1);
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle} UPD`);
          QuickMarcEditor.pressSaveAndCloseButton();
          testData.boxesWithErrors.forEach((boxName) => {
            QuickMarcEditor.checkErrorMessage(3, testData.tag008ErrorText(boxName));
          });
          QuickMarcEditor.verifyValidationCallout(0, 5);

          QuickMarcEditor.update008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            testData.invalidDate2,
          );
          QuickMarcEditor.verify008TextFields(
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            testData.invalidDate2,
          );

          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.pressSaveAndCloseButton();
          testData.boxesWithErrors.forEach((boxName) => {
            QuickMarcEditor.checkErrorMessage(3, testData.tag008ErrorText(boxName));
          });
          QuickMarcEditor.checkErrorMessage(3, testData.date2ErrorText);
          QuickMarcEditor.verifyValidationCallout(0, 6);
        },
      );
    });
  });
});
