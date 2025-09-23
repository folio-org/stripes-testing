import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_006_FIELD_TYPE_DROPDOWN,
  INVENTORY_007_FIELD_TYPE_DROPDOWN,
} from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        titleWith006007: `AT_C380611_MarcBibInstance_${getRandomPostfix()}_with_006_007`,
        titleWithout006007: `AT_C380611_MarcBibInstance_${getRandomPostfix()}_without_006_007`,
        userProperties: {},
        tags: {
          tag006: '006',
          tag007: '007',
          tag008: '008',
          tag245: '245',
        },
      };

      // MARC record with 006 and 007 fields
      const marcRecordWith006007Fields = [
        {
          tag: testData.tags.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tags.tag245,
          content: `$a ${testData.titleWith006007}`,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tags.tag006,
          content: {
            Type: 'm',
            Audn: '|',
            Form: '|',
            File: 'd',
            GPub: '|',
          },
        },
        {
          tag: testData.tags.tag007,
          content: {
            Category: 'c',
            SMD: 'r',
            Color: 'c',
            Dimensions: 'n',
            Sound: '-',
          },
        },
      ];

      // MARC record without 006 and 007 fields
      const marcRecordWithout006007Fields = [
        {
          tag: testData.tags.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tags.tag245,
          content: `$a ${testData.titleWithout006007}`,
          indicators: ['1', '1'],
        },
      ];

      let instanceIdWith006007;
      let instanceIdWithout006007;

      before('Create test user and MARC bib records', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          // Create MARC bib record with 006/007 fields
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcRecordWith006007Fields,
          ).then((instanceId1) => {
            instanceIdWith006007 = instanceId1;

            // Create MARC bib record without 006/007 fields
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcRecordWithout006007Fields,
            ).then((instanceId2) => {
              instanceIdWithout006007 = instanceId2;
              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C380611_MarcBibInstance');
      });

      it(
        'C380611 Label is shown for "Type" boxes in fields "006", "007" of "MARC bib" record when deriving (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C380611'] },
        () => {
          InventoryInstances.searchByTitle(instanceIdWith006007);
          InventoryInstances.selectInstanceById(instanceIdWith006007);
          InventoryInstance.waitLoading();

          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.verifyFieldsDropdownOption(
            testData.tags.tag006,
            INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
            INVENTORY_006_FIELD_TYPE_DROPDOWN.M,
          );

          QuickMarcEditor.verifyFieldsDropdownOption(
            testData.tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
            INVENTORY_007_FIELD_TYPE_DROPDOWN.C,
          );
          QuickMarcEditor.verifyTextBoxValueInField(
            testData.tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.IBD,
            '\\\\\\',
          );

          const updatedTitle = `${testData.titleWith006007} - Updated`;
          QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${updatedTitle}`);
          QuickMarcEditor.checkContentByTag(testData.tags.tag245, `$a ${updatedTitle}`);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkInstanceTitle(updatedTitle);
          InventorySearchAndFilter.resetAll();

          InventoryInstances.searchByTitle(instanceIdWithout006007);
          InventoryInstances.selectInstanceById(instanceIdWithout006007);
          InventoryInstance.waitLoading();

          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.checkFieldAbsense(testData.tags.tag006);
          QuickMarcEditor.checkFieldAbsense(testData.tags.tag007);

          QuickMarcEditor.addNewField(testData.tags.tag006, '', 4);
          QuickMarcEditor.verifyTagValue(5, testData.tags.tag006);
          QuickMarcEditor.verifyFieldsDropdownOption(
            testData.tags.tag006,
            INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
            '',
          );

          QuickMarcEditor.addNewField(testData.tags.tag007, '', 5);
          QuickMarcEditor.verifyTagValue(6, testData.tags.tag007);
          QuickMarcEditor.verifyFieldsDropdownOption(
            testData.tags.tag007,
            INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
            '',
          );
        },
      );
    });
  });
});
