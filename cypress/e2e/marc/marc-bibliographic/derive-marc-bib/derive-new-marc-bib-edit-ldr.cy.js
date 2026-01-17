import { matching } from '@interactors/html';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_008_FIELD_CONF_DROPDOWN,
  INVENTORY_008_FIELD_FEST_DROPDOWN,
  INVENTORY_008_FIELD_INDX_DROPDOWN,
  INVENTORY_008_FIELD_LITF_DROPDOWN,
  INVENTORY_008_FIELD_FILE_DROPDOWN,
  INVENTORY_008_FIELD_COMP_DROPDOWN,
  INVENTORY_008_FIELD_FMUS_DROPDOWN,
  INVENTORY_008_FIELD_TMAT_DROPDOWN,
  INVENTORY_008_FIELD_TECH_DROPDOWN,
  INVENTORY_008_FIELD_REGL_DROPDOWN,
  INVENTORY_008_FIELD_S_L_DROPDOWN,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag245: '245',
        createdRecordIDs: [],
        tagLDR: 'LDR',
        tag008: '008',
        expected008BoxesSets: [
          [
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.ILLS,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.AUDN,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FORM,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONT,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.GPUB,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.BIOG,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.MREC,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SRCE,
          ],
          [
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.AUDN,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FORM,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FILE,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.GPUB,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.MREC,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SRCE,
          ],
          [
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FMUS,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.PART,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.AUDN,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FORM,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.ACCM,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LTXT,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.TRAR,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.MREC,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SRCE,
          ],
          [
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FREQ,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.REGL,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SRTP,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.ORIG,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FORM,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.ENTW,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONT,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.GPUB,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.ALPH,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SL,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.MREC,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SRCE,
          ],
          [
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.TIME,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.AUDN,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.GPUB,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FORM,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.TMAT,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.TECH,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.MREC,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SRCE,
          ],
          [
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FORM,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.MREC,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SRCE,
          ],
        ],
      };

      const optionsFor008FieldDropdowns = {
        option_1: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
            INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
            INVENTORY_008_FIELD_FEST_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
            INVENTORY_008_FIELD_INDX_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
            INVENTORY_008_FIELD_LITF_DROPDOWN.I,
          );
        },
        option_2: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FILE,
            INVENTORY_008_FIELD_FILE_DROPDOWN.E,
          );
        },
        option_3: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
            INVENTORY_008_FIELD_COMP_DROPDOWN.AN,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FMUS,
            INVENTORY_008_FIELD_FMUS_DROPDOWN.C,
          );
        },
        option_4: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.REGL,
            INVENTORY_008_FIELD_REGL_DROPDOWN.U,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SL,
            INVENTORY_008_FIELD_S_L_DROPDOWN.NO,
          );
        },
        option_5: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.TMAT,
            INVENTORY_008_FIELD_TMAT_DROPDOWN.B,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.TECH,
            INVENTORY_008_FIELD_TECH_DROPDOWN.U,
          );
        },
        option_6: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
        },
      };

      const valid0607ValuesSets = [
        // 1. a, t - a, c, d, m
        {
          typeField: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
          tag008Fields: optionsFor008FieldDropdowns.option_1,
        },
        // 2. m - a, b, c, d, i, m, s
        {
          typeField: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.M,
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.C,
          tag008Fields: optionsFor008FieldDropdowns.option_2,
        },
        // 3. c, d, i, j - a, b, c, d, i, m, s
        {
          typeField: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.D,
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.I,
          tag008Fields: optionsFor008FieldDropdowns.option_3,
        },
        // 4. a - b, i, s
        {
          typeField: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.B,
          tag008Fields: optionsFor008FieldDropdowns.option_4,
        },
        // 5. k - a, b, c, d, i, m, s
        {
          typeField: matching(/k - Two-dimensional nonprojectable\s+graphic/),
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.M,
          tag008Fields: optionsFor008FieldDropdowns.option_5,
        },
        // 6. p - a, b, c, d, i, m, s
        {
          typeField: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.P,
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.S,
          tag008Fields: optionsFor008FieldDropdowns.option_6,
        },
      ];

      const marcFile = {
        marc: 'marcBibFileForC388652.mrc',
        fileName: `testMarcFileC388652.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };

      before('Creating user and data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.waitContentLoading();
          }, 20_000);
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        });
      });

      it(
        'C388652 "008" field updated when valid LDR 06-07 combinations entered when deriving "MARC bib" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C388652'] },
        () => {
          valid0607ValuesSets.forEach((set, index) => {
            cy.visit(`${TopMenu.inventoryPath}/view/${testData.createdRecordIDs[0]}`);
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.waitLoading();

            const title = `Derived_C388652_${getRandomPostfix()}`;
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${title}`);

            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tagLDR,
              INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
              set.typeField,
            );
            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tagLDR,
              INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
              set.blvlField,
            );
            cy.wait(1000);
            QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets[index]);
            set.tag008Fields();

            QuickMarcEditor.saveAndCloseWithValidationWarnings();
            InventoryInstance.waitInstanceRecordViewOpened(title);
          });

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets[5]);
        },
      );
    });
  });
});
