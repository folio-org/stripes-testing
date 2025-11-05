import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_008_FIELD_CONF_DROPDOWN,
  INVENTORY_008_FIELD_FEST_DROPDOWN,
  INVENTORY_008_FIELD_INDX_DROPDOWN,
  INVENTORY_008_FIELD_LITF_DROPDOWN,
  INVENTORY_008_FIELD_FILE_DROPDOWN,
  INVENTORY_008_FIELD_COMP_DROPDOWN,
  INVENTORY_008_FIELD_FMUS_DROPDOWN,
  INVENTORY_008_FIELD_REGL_DROPDOWN,
  INVENTORY_008_FIELD_S_L_DROPDOWN,
  INVENTORY_008_FIELD_TMAT_DROPDOWN,
  INVENTORY_008_FIELD_TECH_DROPDOWN,
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
    describe('Edit MARC bib', () => {
      const testData = {};
      const instanceTitle = 'C388651 The Journal of ecclesiastical history.';
      const tagLDR = 'LDR';
      const tag008 = '008';
      const changesSavedCallout =
        'This record has successfully saved and is in process. Changes may not appear immediately.';
      const date = '750907';
      const setsOfValues = [
        {
          LDRDropdownStatusOptionSets: [
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.T,
          ],
          LDRDropdownBlvlOptionSets: [
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.C,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.D,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.M,
          ],
          fields008Labels: [
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
          validValuesFor008Field: [
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FEST,
              option: INVENTORY_008_FIELD_FEST_DROPDOWN.ONE,
            },
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.INDX,
              option: INVENTORY_008_FIELD_INDX_DROPDOWN.ONE,
            },
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LITF,
              option: INVENTORY_008_FIELD_LITF_DROPDOWN.I,
            },
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
              option: INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
            },
          ],
        },
        {
          LDRDropdownStatusOptionSets: [INVENTORY_LDR_FIELD_TYPE_DROPDOWN.M],
          LDRDropdownBlvlOptionSets: [
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.B,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.C,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.D,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.I,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.M,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.S,
          ],
          fields008Labels: [
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
          validValuesFor008Field: [
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FILE,
              option: INVENTORY_008_FIELD_FILE_DROPDOWN.A,
            },
          ],
        },
        {
          LDRDropdownStatusOptionSets: [
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.C,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.D,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.I,
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.J,
          ],
          LDRDropdownBlvlOptionSets: [
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.B,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.C,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.D,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.I,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.M,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.S,
          ],
          fields008Labels: [
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
          validValuesFor008Field: [
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.COMP,
              option: INVENTORY_008_FIELD_COMP_DROPDOWN.AN,
            },
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FMUS,
              option: INVENTORY_008_FIELD_FMUS_DROPDOWN.A,
            },
          ],
        },
        {
          LDRDropdownStatusOptionSets: [INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A],
          LDRDropdownBlvlOptionSets: [
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.B,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.I,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.S,
          ],
          fields008Labels: [
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
          validValuesFor008Field: [
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.REGL,
              option: INVENTORY_008_FIELD_REGL_DROPDOWN.N,
            },
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SL,
              option: INVENTORY_008_FIELD_S_L_DROPDOWN[0],
            },
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
              option: INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
            },
          ],
        },
        {
          LDRDropdownStatusOptionSets: [
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.G,
            'k - Two-dimensional nonprojectable graphic',
            INVENTORY_LDR_FIELD_TYPE_DROPDOWN.R,
          ],
          LDRDropdownBlvlOptionSets: [
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.B,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.C,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.D,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.I,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.M,
            INVENTORY_LDR_FIELD_BLVL_DROPDOWN.S,
          ],
          fields008Labels: [
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
          validValuesFor008Field: [
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.TMAT,
              option: INVENTORY_008_FIELD_TMAT_DROPDOWN.A,
            },
            {
              dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.TECH,
              option: INVENTORY_008_FIELD_TECH_DROPDOWN.A,
            },
          ],
        },
      ];
      const lastSetOfValues = {
        LDRDropdownStatusOptionSets: [INVENTORY_LDR_FIELD_TYPE_DROPDOWN.P],
        LDRDropdownBlvlOptionSets: [
          INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A,
          INVENTORY_LDR_FIELD_BLVL_DROPDOWN.B,
          INVENTORY_LDR_FIELD_BLVL_DROPDOWN.C,
          INVENTORY_LDR_FIELD_BLVL_DROPDOWN.D,
          INVENTORY_LDR_FIELD_BLVL_DROPDOWN.I,
          INVENTORY_LDR_FIELD_BLVL_DROPDOWN.M,
          INVENTORY_LDR_FIELD_BLVL_DROPDOWN.S,
        ],
        fields008Labels: [
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE2,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CTRY,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.FORM,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.MREC,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SRCE,
        ],
        validValuesFor008Field: [
          {
            dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SRCE,
            option: 'd - Other',
          },
        ],
      };

      const marcFile = {
        marc: 'marcBibFileForC388651.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };

      const instanceID = [];

      before('Create user and data', () => {
        cy.getAdminToken().then(() => {
          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: `title="${instanceTitle}"`,
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              instanceID.push(record[marcFile.propertyName].id);
            });
          });
        });
      });

      after('Delete user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(instanceID[0]);
      });

      it(
        'C388651 "008" field updated when valid LDR 06-07 combinations entered when editing "MARC bib" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C388651'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });

          InventoryInstances.searchByTitle(instanceTitle);
          InventoryInstances.selectInstance();
          cy.intercept(`records-editor/records?externalId=${instanceID[0]}`).as('recordOpened');
          InventoryInstance.editMarcBibliographicRecord();
          cy.wait('@recordOpened').then((res) => {
            cy.expect(
              res.response.body.fields.filter((field) => field.tag === tag008)[0].content.Entered,
            ).equal(date);
          });

          setsOfValues.forEach((setOfValues) => {
            for (let i = 0; i < setOfValues.LDRDropdownStatusOptionSets.length; i++) {
              QuickMarcEditor.selectFieldsDropdownOption(
                tagLDR,
                INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
                setOfValues.LDRDropdownStatusOptionSets[i],
              );

              for (let j = 0; j < setOfValues.LDRDropdownBlvlOptionSets.length; j++) {
                QuickMarcEditor.selectFieldsDropdownOption(
                  tagLDR,
                  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                  setOfValues.LDRDropdownBlvlOptionSets[j],
                );
                cy.wait(500);
                QuickMarcEditor.check008FieldLabels(setOfValues.fields008Labels);
              }
            }

            setOfValues.validValuesFor008Field.forEach((validValueFor008Field) => {
              QuickMarcEditor.selectFieldsDropdownOption(
                tag008,
                validValueFor008Field.dropdownLabel,
                validValueFor008Field.option,
              );
              cy.wait(500);
            });
            // wait for all changes complete in LDR field.
            cy.wait(1000);
            QuickMarcEditor.pressSaveAndKeepEditing(changesSavedCallout);
            QuickMarcEditor.check008FieldLabels(setOfValues.fields008Labels);
            cy.wait(1000);
          });

          for (let i = 0; i < lastSetOfValues.LDRDropdownStatusOptionSets.length; i++) {
            QuickMarcEditor.selectFieldsDropdownOption(
              tagLDR,
              INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE,
              lastSetOfValues.LDRDropdownStatusOptionSets[i],
            );

            for (let j = 0; j < lastSetOfValues.LDRDropdownBlvlOptionSets.length; j++) {
              QuickMarcEditor.selectFieldsDropdownOption(
                tagLDR,
                INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL,
                lastSetOfValues.LDRDropdownBlvlOptionSets[j],
              );
              cy.wait(500);
              QuickMarcEditor.check008FieldLabels(lastSetOfValues.fields008Labels);
            }
          }

          lastSetOfValues.validValuesFor008Field.forEach((validValueFor008Field) => {
            QuickMarcEditor.selectFieldsDropdownOption(
              tag008,
              validValueFor008Field.dropdownLabel,
              validValueFor008Field.option,
            );
            cy.wait(500);
          });
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          cy.intercept(`records-editor/records?externalId=${instanceID[0]}`).as('recordUpdated');
          InventoryInstance.editMarcBibliographicRecord();
          cy.wait('@recordUpdated').then((res) => {
            cy.expect(
              res.response.body.fields.filter((field) => field.tag === tag008)[0].content.Entered,
            ).equal(date);
          });
          QuickMarcEditor.check008FieldLabels(lastSetOfValues.fields008Labels);
        },
      );
    });
  });
});
