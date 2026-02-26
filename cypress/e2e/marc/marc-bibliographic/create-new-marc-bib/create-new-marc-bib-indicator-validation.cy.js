import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES } from '../../../../support/constants';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import {
  getBibliographicSpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C422108_MarcBibInstance_${getRandomPostfix()}`,
        paneHeaderCreateRecordText: /New .*MARC bib record/,
        tagLDR: 'LDR',
        tag245: '245',
        tag008: '008',
        tag600: '600',
        tag610: '610',
        tag611: '611',
        tag630: '630',
        indicatorFailText:
          "Fail: Indicator must contain one character and can only accept numbers 0-9, letters a-z or a '\\'.Help",
        indicatorWarningText: (index, value) => `Warn: ${index ? 'Second' : 'First'} Indicator '${value}' is undefined.Help`,
        contentFor6XX: 'Subject Indicator test',
      };
      const indicatorData245 = [
        {
          values: ['A', 'Z'],
          error: `${testData.indicatorFailText}${testData.indicatorFailText}`,
          warning: null,
        },
        {
          values: ['#', '$'],
          error: `${testData.indicatorFailText}${testData.indicatorFailText}`,
          warning: null,
        },
        {
          values: ['', '$'],
          error: testData.indicatorFailText,
          warning: testData.indicatorWarningText(0, '\\'),
        },
        {
          values: ['#', ''],
          error: testData.indicatorFailText,
          warning: testData.indicatorWarningText(1, '\\'),
        },
      ];
      const indicatorValues6XX = [
        { tag: testData.tag600, values: [undefined, undefined] },
        { tag: testData.tag610, values: ['', ''] },
        { tag: testData.tag611, values: ['0', '7'] },
        { tag: testData.tag630, values: ['a', 'z'] },
      ];
      const indicatorValuesAfterSave = [
        { tag: testData.tag245, values: ['\\', '\\'] },
        { tag: testData.tag600, values: ['\\', '\\'] },
        { tag: testData.tag610, values: ['\\', '\\'] },
        { tag: testData.tag611, values: ['0', '7'] },
        { tag: testData.tag630, values: ['a', 'z'] },
      ];
      const user = {};

      let specId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((createdUserProperties) => {
          user.userProperties = createdUserProperties;

          getBibliographicSpec().then((spec) => {
            specId = spec.id;
            toggleAllUndefinedValidationRules(specId, { enable: true });
          });

          cy.login(user.userProperties.username, user.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
        toggleAllUndefinedValidationRules(specId, { enable: false });
      });

      it(
        'C422108 Indicator boxes validation during creation of MARC bib record (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire', 'nonParallel', 'C422108'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(testData.paneHeaderCreateRecordText);
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle}`);
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );
          indicatorData245.forEach((item) => {
            const warningCount = item.warning ? 1 : 0;
            const errorCount = item.warning ? 1 : 2;
            QuickMarcEditor.updateIndicatorValue(testData.tag245, item.values[0], 0);
            QuickMarcEditor.updateIndicatorValue(testData.tag245, item.values[1], 1);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.verifyValidationCallout(warningCount, errorCount);
            if (item.error) QuickMarcEditor.checkErrorMessageForFieldByTag(testData.tag245, item.error);
            if (item.warning) QuickMarcEditor.checkWarningMessageForFieldByTag(testData.tag245, item.warning);
            QuickMarcEditor.closeAllCallouts();
          });

          QuickMarcEditor.updateIndicatorValue(testData.tag245, '', 0);
          indicatorValues6XX.forEach((item) => {
            QuickMarcEditor.addEmptyFields(4);
            QuickMarcEditor.checkEmptyFieldAdded(5);
            QuickMarcEditor.addValuesToExistingField(
              4,
              item.tag,
              `$a ${testData.contentFor6XX}`,
              ...item.values,
            );
          });
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(8, 0);
          [testData.tag245, testData.tag600, testData.tag610].forEach((tag) => {
            QuickMarcEditor.checkWarningMessageForFieldByTag(
              tag,
              `${testData.indicatorWarningText(0, '\\')}${testData.indicatorWarningText(1, '\\')}`,
            );
          });
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag630,
            `${testData.indicatorWarningText(0, 'a')}${testData.indicatorWarningText(1, 'z')}`,
          );

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndClose();
          InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
          InventoryInstance.editMarcBibliographicRecord();
          indicatorValuesAfterSave.forEach((item) => {
            QuickMarcEditor.verifyIndicatorValue(item.tag, item.values[0], 0);
            QuickMarcEditor.verifyIndicatorValue(item.tag, item.values[1], 1);
          });
        },
      );
    });
  });
});
