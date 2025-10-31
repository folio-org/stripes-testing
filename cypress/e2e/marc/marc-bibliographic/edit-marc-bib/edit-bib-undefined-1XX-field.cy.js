import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        title: `AT_C519975_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag245: '245',
          tag199: '199',
        },
        newFieldContent: 'Some content for new field 199',
        expectedWarning: 'Warn: Field is undefined.',
        userProperties: {},
        valid245indicatorValue: '1',
      };

      let createdInstanceId;
      let specId;

      before('Create test data and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          getBibliographicSpec().then((bibSpec) => {
            specId = bibSpec.id;
            toggleAllUndefinedValidationRules(specId, { enable: true });
          });

          cy.createSimpleMarcBibViaAPI(testData.title).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        toggleAllUndefinedValidationRules(specId, { enable: false });
      });

      it(
        'C519975 Edit MARC bib record with undefined 1XX field when Undefined rules are enabled (spitfire)',
        { tags: ['extendedPathFlaky', 'spitfire', 'nonParallel', 'C519975'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.valid245indicatorValue,
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.valid245indicatorValue,
            1,
          );

          QuickMarcEditor.addNewField(testData.tags.tag199, testData.newFieldContent, 4);
          QuickMarcEditor.verifyTagValue(5, testData.tags.tag199);

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(5, testData.expectedWarning);
          QuickMarcEditor.verifyValidationCallout(1, 0);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
        },
      );
    });
  });
});
