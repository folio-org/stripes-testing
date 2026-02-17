import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../support/utils/users';
import {
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
} from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const { user, memberTenant } = parseSanityParameters();
      let instanceID = null;
      const OCLCAuthentication = '100481406/PAOLF';

      before('Setup', () => {
        cy.setTenant(memberTenant.id);
        cy.getAdminToken().then(() => {
          Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
        });

        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        cy.allure().logCommandSteps();

        InventoryActions.import();
        InventoryInstance.getId().then((id) => {
          instanceID = id;
        });
      });

      after('Cleanup', () => {
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password, { log: false });
        if (instanceID) {
          InventoryInstance.deleteInstanceViaApi(instanceID);
        }
      });

      it(
        'C353610 Verify "LDR" validation rules with valid data for positions 06 and 07 when editing record (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C353610'] },
        () => {
          const tagLDR = 'LDR';
          const field008BoxesAbsent = ['Type', 'Blvl'];
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
          InventoryInstance.checkExpectedMARCSource();

          for (let i = 0; i < typeDropdownOptions.length; i++) {
            InventoryInstance.goToEditMARCBiblRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.check008FieldBoxesAbsent(...field008BoxesAbsent);
            QuickMarcEditor.verifyBoxLabelsInLDRFieldInMarcBibRecord();

            typeDropdownOptions.forEach((dropdownOption) => {
              QuickMarcEditor.verifyFieldsDropdownOption(
                tagLDR,
                INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                dropdownOption,
              );
            });
            blvlDropdownOptions.forEach((dropdownOption) => {
              QuickMarcEditor.verifyFieldsDropdownOption(
                tagLDR,
                INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                dropdownOption,
              );
            });

            LDRDropdownOptionSets.forEach((LDRDropdownOptionSet) => {
              QuickMarcEditor.selectFieldsDropdownOption(
                tagLDR,
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
                tagLDR,
                LDRDropdownOptionSet.name,
                LDRDropdownOptionSet.options[i % LDRDropdownOptionSet.options.length],
              );
            });

            checkedTypeDropdownOption =
              LDRDropdownOptionSets[0].options[i % LDRDropdownOptionSets[0].options.length];

            QuickMarcEditor.selectValidOptionsFor008FieldWhenUpdatingTypeDropdownInLDRField(
              checkedTypeDropdownOption,
            );
            cy.wait(1_000);
            QuickMarcEditor.pressSaveAndClose();
            InventoryInstance.waitLoading();
          }
        },
      );
    });
  });
});
