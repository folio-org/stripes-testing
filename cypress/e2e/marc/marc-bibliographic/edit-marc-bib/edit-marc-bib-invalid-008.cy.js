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
    describe('Edit MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C503014_MarcBibInstance_${getRandomPostfix()}`,
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
        langBox: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
        tag008ErrorText: (boxName) => `Fail: Record cannot be saved. Field 008 contains an invalid value in "${boxName}" position.`,
        invalidLangValue: 'jp',
        langErrorText: 'Fail: Invalid Lang field length, must be 3 characters.',
      };
      const createdRecordIDs = [];
      let user;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
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
        'C503014 Cannot update MARC bib with more or less than 4 characters in "Date 1" and "Date 2" fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C503014'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          testData.boxesWithErrors.forEach((boxName) => {
            QuickMarcEditor.checkDropdownMarkedAsInvalid(testData.tag008, boxName);
          });
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.valid245IndicatorValue, 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.valid245IndicatorValue, 1);
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle} UPD`);
          QuickMarcEditor.pressSaveAndCloseButton();

          QuickMarcEditor.verifyValidationCallout(0, 5);
          testData.boxesWithErrors.forEach((boxName) => {
            QuickMarcEditor.checkErrorMessage(3, testData.tag008ErrorText(boxName));
          });

          QuickMarcEditor.update008TextFields(testData.langBox, testData.invalidLangValue);
          QuickMarcEditor.verify008TextFields(testData.langBox, testData.invalidLangValue);

          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(0, 6);
          testData.boxesWithErrors.forEach((boxName) => {
            QuickMarcEditor.checkErrorMessage(3, testData.tag008ErrorText(boxName));
          });
          QuickMarcEditor.checkErrorMessage(3, testData.langErrorText);
        },
      );
    });
  });
});
