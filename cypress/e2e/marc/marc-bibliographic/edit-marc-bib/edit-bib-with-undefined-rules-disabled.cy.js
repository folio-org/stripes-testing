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
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        title: `AT_C895678_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag245: '245',
          tag983: '983',
        },
        userProperties: {},
        valid245indicatorValue: '1',
      };
      const fields = [
        {
          tag: testData.tags.tag245,
          content: `$a ${testData.title} $t Indicator, Subfield codes not specified in MARC validation rules`,
          indicators: ['8', '8'],
        },
        {
          tag: testData.tags.tag983,
          content: '$a Undefined field content',
          indicators: ['1', '2'],
        },
      ];
      let createdInstanceId;

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          getBibliographicSpec().then((bibSpec) => {
            // default value - setting just in case it was changed by someone
            toggleAllUndefinedValidationRules(bibSpec.id, { enable: false });
          });

          cy.createSimpleMarcBibViaAPI(testData.title).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C895678 Edit MARC bib record with undefined Field / Indicators / Subfields when "Undefined" rules are disabled (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C895678'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.updateExistingField(fields[0].tag, fields[0].content);
          QuickMarcEditor.updateIndicatorValue(fields[0].tag, fields[0].indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(fields[0].tag, fields[0].indicators[1], 1);

          QuickMarcEditor.addNewField(fields[1].tag, fields[1].content, 4);
          QuickMarcEditor.verifyTagValue(5, fields[1].tag);
          QuickMarcEditor.updateIndicatorValue(fields[1].tag, fields[1].indicators[0], 0);
          QuickMarcEditor.updateIndicatorValue(fields[1].tag, fields[1].indicators[1], 1);

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkButtonsDisabled();
          InteractorsTools.checkNoErrorCallouts();
        },
      );
    });
  });
});
