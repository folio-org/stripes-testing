import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import {
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_008_FIELD_CONF_DROPDOWN,
  INVENTORY_008_FIELD_FEST_DROPDOWN,
  INVENTORY_008_FIELD_INDX_DROPDOWN,
  INVENTORY_008_FIELD_LITF_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_008_FIELD_COMP_DROPDOWN,
  INVENTORY_008_FIELD_FMUS_DROPDOWN,
  INVENTORY_008_FIELD_CRTP_DROPDOWN,
  INVENTORY_008_FIELD_TMAT_DROPDOWN,
  INVENTORY_008_FIELD_TECH_DROPDOWN,
  INVENTORY_008_FIELD_FILE_DROPDOWN,
  INVENTORY_008_FIELD_REGL_DROPDOWN,
  INVENTORY_008_FIELD_S_L_DROPDOWN,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tags: {
          tag245: '245',
          tagLDR: 'LDR',
          tag008: '008',
        },
        valid008Values: [
          {
            label: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
            value: '1111',
          },
          {
            label: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
            value: '2222',
          },
          {
            label: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
            value: 'ccc',
          },
          {
            label: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
            value: 'hhh',
          },
        ],

        fieldContents: {
          tag245ContentPrefix: 'Created_Bib_',
          tag245ValueWithAllSubfields:
            '$a testA $b testB $c testC $f testF $g testG $h testH $k testK $n testN $p testP $s testS $6 test6 $7 test7 $8 test8',
          instanceTitleWithSubfields: 'testA testB testC testF testG testH testK testN testP testS',
        },

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
        ldr06And07Values: [
          'naa',
          'nab',
          'ncb',
          'ndc',
          'ned',
          'nfi',
          'ngm',
          'nis',
          'nja',
          'nkb',
          'nmc',
          'nod',
          'npi',
          'nrm',
          'nts',
        ],
      };

      const optionsFor008FieldDropdowns = {
        option_1: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
            INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
            INVENTORY_008_FIELD_FEST_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
            INVENTORY_008_FIELD_INDX_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
            INVENTORY_008_FIELD_LITF_DROPDOWN.I,
          );
        },
        option_2: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
            INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.REGL,
            INVENTORY_008_FIELD_REGL_DROPDOWN.U,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SL,
            INVENTORY_008_FIELD_S_L_DROPDOWN.NO,
          );
        },
        option_3: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
            INVENTORY_008_FIELD_COMP_DROPDOWN.AN,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FMUS,
            INVENTORY_008_FIELD_FMUS_DROPDOWN.C,
          );
        },
        option_4: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CRTP,
            INVENTORY_008_FIELD_CRTP_DROPDOWN.D,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
            INVENTORY_008_FIELD_INDX_DROPDOWN.ONE,
          );
        },
        option_5: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.TMAT,
            INVENTORY_008_FIELD_TMAT_DROPDOWN.B,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.TECH,
            INVENTORY_008_FIELD_TECH_DROPDOWN.U,
          );
        },
        option_6: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FILE,
            INVENTORY_008_FIELD_FILE_DROPDOWN.E,
          );
        },
        option_7: () => {
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.M,
          );
        },
      };

      const valid0607ValuesSets = [
        {
          typeField: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
          tag008Fields: () => {
            optionsFor008FieldDropdowns.option_1();
          },
        },
        {
          typeField: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.M,
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.C,
          tag008Fields: () => {
            optionsFor008FieldDropdowns.option_6();
          },
        },
        {
          typeField: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.D,
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.I,
          tag008Fields: () => {
            optionsFor008FieldDropdowns.option_3();
          },
        },
        {
          typeField: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.B,
          tag008Fields: () => {
            optionsFor008FieldDropdowns.option_2();
          },
        },
        {
          typeField: 'k - Two-dimensional nonprojectable graphic',
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.M,
          tag008Fields: () => {
            optionsFor008FieldDropdowns.option_5();
          },
        },
        {
          typeField: INVENTORY_LDR_FIELD_TYPE_DROPDOWN.P,
          blvlField: INVENTORY_LDR_FIELD_BLVL_DROPDOWN.S,
          tag008Fields: () => {
            optionsFor008FieldDropdowns.option_7();
          },
        },
      ];

      const createdInstanceIDs = [];
      const userData = {};

      before(() => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((createdUserProperties) => {
          userData.C380707UserProperties = createdUserProperties;
        });
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          userData.C380704UserProperties = createdUserProperties;
        });
      });

      after('Deleting created users, Instances', () => {
        cy.getAdminToken();
        Object.values(userData).forEach((user) => {
          Users.deleteViaApi(user.userId);
        });
        createdInstanceIDs.forEach((instanceID) => {
          InventoryInstance.deleteInstanceViaApi(instanceID);
        });
      });

      it(
        'C422109 Creating a new "MARC bib" record with valid LDR 06, 07 values. (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C422109'] },
        () => {
          cy.login(
            userData.C380704UserProperties.username,
            userData.C380704UserProperties.password,
            {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            },
          );

          testData.ldr06And07Values.forEach((dropdownOption) => {
            const title = testData.fieldContents.tag245ContentPrefix + getRandomPostfix();

            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${title}`);
            Object.values(INVENTORY_LDR_FIELD_TYPE_DROPDOWN).forEach((option) => {
              QuickMarcEditor.verifyFieldsDropdownOption(
                testData.tags.tagLDR,
                INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                option,
              );
            });
            Object.values(INVENTORY_LDR_FIELD_BLVL_DROPDOWN).forEach((option) => {
              QuickMarcEditor.verifyFieldsDropdownOption(
                testData.tags.tagLDR,
                INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                option,
              );
            });

            switch (dropdownOption) {
              case 'naa':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
                );
                optionsFor008FieldDropdowns.option_1();
                break;
              case 'nab':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.B,
                );
                optionsFor008FieldDropdowns.option_2();
                break;
              case 'ncb':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.C,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.B,
                );
                optionsFor008FieldDropdowns.option_3();
                break;
              case 'ndc':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.D,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.C,
                );
                optionsFor008FieldDropdowns.option_3();
                break;
              case 'ned':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.E,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.D,
                );
                optionsFor008FieldDropdowns.option_4();
                break;
              case 'nfi':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.F,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.I,
                );
                optionsFor008FieldDropdowns.option_4();
                break;
              case 'ngm':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.G,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.M,
                );
                optionsFor008FieldDropdowns.option_5();
                break;
              case 'nis':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.I,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.S,
                );
                optionsFor008FieldDropdowns.option_3();
                break;
              case 'nja':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.J,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
                );
                optionsFor008FieldDropdowns.option_3();
                break;
              case 'nkb':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  'k - Two-dimensional nonprojectable graphic',
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.B,
                );
                optionsFor008FieldDropdowns.option_5();
                break;
              case 'nmc':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.M,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.C,
                );
                optionsFor008FieldDropdowns.option_6();
                break;
              case 'nod':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.O,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.D,
                );
                optionsFor008FieldDropdowns.option_5();
                break;
              case 'npi':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.P,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.I,
                );
                optionsFor008FieldDropdowns.option_7();
                break;
              case 'nrm':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.R,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.M,
                );
                optionsFor008FieldDropdowns.option_5();
                break;
              case 'nts':
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                  INVENTORY_LDR_FIELD_TYPE_DROPDOWN.T,
                );
                QuickMarcEditor.selectFieldsDropdownOption(
                  testData.tags.tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  INVENTORY_LDR_FIELD_BLVL_DROPDOWN.S,
                );
                optionsFor008FieldDropdowns.option_1();
                break;
              default:
                break;
            }
            cy.wait(1000);
            QuickMarcEditor.saveAndCloseWithValidationWarnings();
            QuickMarcEditor.closeAllCallouts();
            InventoryInstance.checkInstanceTitle(title);
            InventoryInstance.getId().then((id) => {
              createdInstanceIDs.push(id);
            });
            InventoryInstance.viewSource();
            InventoryViewSource.contains(`${dropdownOption} a2200`);
            InventoryViewSource.close();
          });
        },
      );

      it(
        'C422114 Add all possible "245" subfields when creating a new "MARC bib" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C422114'] },
        () => {
          cy.login(
            userData.C380704UserProperties.username,
            userData.C380704UserProperties.password,
            {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            },
          );
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.updateLDR06And07Positions();
          testData.valid008Values.forEach((textField) => {
            QuickMarcEditor.update008TextFields(textField.label, textField.value);
            QuickMarcEditor.verify008TextFields(textField.label, textField.value);
          });
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            testData.fieldContents.tag245ValueWithAllSubfields,
          );
          QuickMarcEditor.saveAndCloseWithValidationWarnings();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.fieldContents.instanceTitleWithSubfields);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(createdInstanceIDs);
          QuickMarcEditor.checkContent(testData.fieldContents.tag245ValueWithAllSubfields, 4);
          testData.valid008Values.forEach((textField) => {
            QuickMarcEditor.verify008TextFields(textField.label, textField.value);
          });
        },
      );

      it(
        'C422116 "008" field updated when valid LDR 06-07 combinations entered upon creation of "MARC bib" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C422116'] },
        () => {
          cy.login(
            userData.C380704UserProperties.username,
            userData.C380704UserProperties.password,
            {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            },
          );
          valid0607ValuesSets.forEach((set, index) => {
            const title = testData.fieldContents.tag245ContentPrefix + getRandomPostfix();
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${title}`);
            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tags.tagLDR,
              INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
              set.typeField,
            );
            QuickMarcEditor.selectFieldsDropdownOption(
              testData.tags.tagLDR,
              INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
              set.blvlField,
            );
            cy.wait(1000);
            QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets[index]);
            set.tag008Fields();
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(4000);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
            InventoryInstance.waitInstanceRecordViewOpened(title);
            InventoryInstance.getId().then((id) => {
              createdInstanceIDs.push(id);
            });
          });
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets[5]);
        },
      );
    });
  });
});
