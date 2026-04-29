import permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
} from '../../../../support/constants';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitlePrefix: `AT_C353611_MarcBibInstance_${randomPostfix}`,
        tag008: '008',
        tag245: '245',
        tagLDR: 'LDR',
        tagLDRSource: 'LEADER',
      };
      const marcInstanceFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.instanceTitlePrefix}_0`,
          indicators: ['1', '1'],
        },
      ];
      const typeDropdownOptions = Object.values(INVENTORY_LDR_FIELD_TYPE_DROPDOWN);
      const blvlDropdownOptions = Object.values(INVENTORY_LDR_FIELD_BLVL_DROPDOWN);
      const LDRDropdownOptionSets = [
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
          options: typeDropdownOptions,
        },
        {
          name: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
          options: blvlDropdownOptions,
        },
      ];
      let checkedTypeDropdownOption;
      let checkedBlvlDropdownOption;
      let userId;
      let sourceInstanceId;

      before('Create test data', () => {
        cy.getAdminToken().then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C353611');

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((id) => {
            sourceInstanceId = id;
          });
        });

        cy.createTempUser([
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userId);
        InventoryInstance.deleteInstanceViaApi(sourceInstanceId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitlePrefix);
      });

      it(
        'C353611 Verify "LDR" validation rules with valid data for positions 06 and 07 when deriving record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C353611'] },
        () => {
          // Navigate to source instance
          InventoryInstances.searchByTitle(sourceInstanceId);
          InventoryInstances.selectInstanceById(sourceInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkExpectedMARCSource();

          for (let i = 0; i < typeDropdownOptions.length; i++) {
            const derivedInstanceTitle = `${testData.instanceTitlePrefix}_${i + 1}`;

            // Navigate back to source instance if not the first iteration
            if (i > 0) {
              cy.visit(TopMenu.inventoryPath);
              InventoryInstances.waitContentLoading();
              InventoryInstances.searchByTitle(sourceInstanceId);
              InventoryInstances.selectInstanceById(sourceInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.waitInstanceRecordViewOpened();
            }

            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyBoxLabelsInLDRFieldInMarcBibRecord();

            typeDropdownOptions.forEach((dropdownOption) => {
              QuickMarcEditor.verifyFieldsDropdownOption(
                testData.tagLDR,
                INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                dropdownOption,
              );
            });
            blvlDropdownOptions.forEach((dropdownOption) => {
              QuickMarcEditor.verifyFieldsDropdownOption(
                testData.tagLDR,
                INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                dropdownOption,
              );
            });

            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              QuickMarcEditor.selectFieldsDropdownOption(
                testData.tagLDR,
                LDRDropdownOptionSet.name,
                LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length] ===
                  // when select this option we have one space between two last words
                  'k - Two-dimensional nonprojectable  graphic'
                  ? 'k - Two-dimensional nonprojectable graphic'
                  : LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
              );
            });

            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              QuickMarcEditor.verifyDropdownOptionChecked(
                testData.tagLDR,
                LDRDropdownOptionSet.name,
                LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
              );
            });

            checkedTypeDropdownOption =
              LDRDropdownOptionSets[0].options[i % LDRDropdownOptionSets[0].options.length];
            checkedBlvlDropdownOption =
              LDRDropdownOptionSets[1].options[i % LDRDropdownOptionSets[1].options.length];

            QuickMarcEditor.selectValidOptionsFor008FieldWhenUpdatingTypeDropdownInLDRField(
              checkedTypeDropdownOption,
            );
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${derivedInstanceTitle}`);
            QuickMarcEditor.checkContentByTag(testData.tag245, `$a ${derivedInstanceTitle}`);
            cy.wait(1000);
            QuickMarcEditor.pressSaveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkInstanceTitle(derivedInstanceTitle);

            if ([0, typeDropdownOptions.length - 1].includes(i)) {
              InventoryInstance.viewSource();
              MarcAuthority.contains(
                `^${testData.tagLDRSource} \\w{6}${checkedTypeDropdownOption[0]}${checkedBlvlDropdownOption[0]}.+`,
                { regexp: true },
              );
            }
          }
        },
      );
    });
  });
});
