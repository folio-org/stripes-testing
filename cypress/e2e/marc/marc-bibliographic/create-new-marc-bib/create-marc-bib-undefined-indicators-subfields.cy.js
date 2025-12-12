import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  getBibliographicSpec,
  toggleAllUndefinedValidationRules,
  generateTestFieldData,
} from '../../../../support/api/specifications-helper';
import { INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        title: `AT_C514908_MarcBib_${getRandomPostfix()}`,
        tag245: '245',
        tag983: '983',
        tag008: '008',
        field245: {
          indicators: ['8', '9'],
          content: '$a Create MARC bib $t Indicator, Subfield codes not specified',
        },
        field983: {
          indicators: ['1', '2'],
          content: '$a Local field with local indicator $b and subfield',
          contentWithExtraSubfield: '$a Local field with local indicator $b and subfield $c ',
        },
        indicatorWarningText: (index, value) => `Warn: ${index ? 'Second' : 'First'} Indicator '${value}' is undefined.`,
        subfieldWarningText: (code) => `Warn: Subfield '${code}' is undefined.`,
        expectedWarningCount: 6,
        userProperties: {},
      };

      let specId;
      let createdInstanceId;
      let field983Id;

      before('Create user and enable validation rules', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          getBibliographicSpec().then((bibSpec) => {
            specId = bibSpec.id;
            const field983Data = generateTestFieldData('C514908', {
              tag: '983',
              label: 'Local_Field_983',
              scope: 'local',
              repeatable: true,
              required: false,
            });
            cy.createSpecificationField(specId, field983Data, false).then((fieldResponse) => {
              field983Id = fieldResponse.body.id;
            });
            toggleAllUndefinedValidationRules(specId, { enable: true });
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete user and disable validation rules', () => {
        cy.getAdminToken();
        getBibliographicSpec().then(({ id }) => {
          toggleAllUndefinedValidationRules(id, { enable: false });
        });
        if (testData.userProperties.userId) {
          Users.deleteViaApi(testData.userProperties.userId);
        }
        if (createdInstanceId) {
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        }
        if (field983Id) {
          cy.deleteSpecificationField(field983Id, false);
        }
      });

      it(
        'C514908 Create MARC bib record with undefined Indicators / Subfield codes in Standard and Local fields when "Undefined" rules are "enabled" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514908', 'nonParallel'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(/New .*MARC bib record/);
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );

          QuickMarcEditor.updateExistingField(testData.tag245, testData.field245.content);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '8', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '9', 1);

          QuickMarcEditor.addNewField(testData.tag983, testData.field983.content, 4);
          QuickMarcEditor.updateIndicatorValue(testData.tag983, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag983, '2', 1);

          // First save attempt - verify warnings
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(testData.expectedWarningCount, 0);
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag245,
            `${testData.indicatorWarningText(0, '8')}Help${testData.subfieldWarningText('t')}Help`,
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            `${testData.indicatorWarningText(0, '1')}${testData.indicatorWarningText(1, '2')}${testData.subfieldWarningText('a')}${testData.subfieldWarningText('b')}`,
          );
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          // Add extra subfield $c to field 983
          QuickMarcEditor.updateExistingField(
            testData.tag983,
            testData.field983.contentWithExtraSubfield,
          );
          cy.wait(1000);

          // Second save attempt - same warnings (empty $c doesn't generate warning)
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(testData.expectedWarningCount, 0);
          QuickMarcEditor.closeAllCallouts();

          // Remove extra subfield $c from 983
          QuickMarcEditor.updateExistingField(testData.tag983, testData.field983.content);
          cy.wait(1000);

          // Third save attempt - same warnings
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(testData.expectedWarningCount, 0);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonSaveAndCloseEnable();

          // Final save - record created successfully
          cy.wait(1000);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          InventoryInstance.getId().then((id) => {
            createdInstanceId = id;
          });

          // Verify source view
          InventoryInstance.viewSource();
          InventoryViewSource.contains(`${testData.tag245}\t8 9\t${testData.field245.content}`);
          InventoryViewSource.contains(`${testData.tag983}\t1 2\t${testData.field983.content}`);
        },
      );
    });
  });
});
