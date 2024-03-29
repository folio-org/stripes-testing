import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { replaceByIndex } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {};

      const initialLDRValue = String.raw`01354cas\a2200409\\\4500`;

      const changesSavedCallout =
        'This record has successfully saved and is in process. Changes may not appear immediately.';

      const changesForLDR = [
        {
          position6: ['a', 'a', 'a', 'a', 't', 't', 't', 't'],
          position7: ['a', 'c', 'd', 'm', 'a', 'c', 'd', 'm'],
          fields008: [
            'Srce',
            'Audn',
            'Lang',
            'Form',
            'Conf',
            'Biog',
            'MRec',
            'Ctry',
            'Cont',
            'GPub',
            'LitF',
            'Indx',
            'Ills',
            'Fest',
            'DtSt',
            'Date 1',
            'Date 2',
          ],
        },
        {
          position6: ['m', 'm', 'm', 'm', 'm', 'm', 'm'],
          position7: ['a', 'b', 'c', 'd', 'i', 'm', 's'],
          fields008: [
            'Srce',
            'Audn',
            'Lang',
            'Form',
            'GPub',
            'MRec',
            'Ctry',
            'File',
            'DtSt',
            'Date 1',
            'Date 2',
          ],
        },
        {
          position6: [
            'c',
            'c',
            'c',
            'c',
            'c',
            'c',
            'c',
            'd',
            'd',
            'd',
            'd',
            'd',
            'd',
            'd',
            'i',
            'i',
            'i',
            'i',
            'i',
            'i',
            'i',
            'j',
            'j',
            'j',
            'j',
            'j',
            'j',
            'j',
          ],
          position7: [
            'a',
            'b',
            'c',
            'd',
            'i',
            'm',
            's',
            'a',
            'b',
            'c',
            'd',
            'i',
            'm',
            's',
            'a',
            'b',
            'c',
            'd',
            'i',
            'm',
            's',
            'a',
            'b',
            'c',
            'd',
            'i',
            'm',
            's',
          ],
          fields008: [
            'Srce',
            'Audn',
            'Lang',
            'Form',
            'Comp',
            'AccM',
            'MRec',
            'Ctry',
            'Part',
            'TrAr',
            'FMus',
            'LTxt',
            'DtSt',
            'Date 1',
            'Date 2',
          ],
        },
        {
          position6: ['a', 'a', 'a'],
          position7: ['b', 'i', 's'],
          fields008: [
            'Srce',
            'GPub',
            'Lang',
            'Form',
            'Conf',
            'Freq',
            'MRec',
            'Ctry',
            'S/L',
            'Orig',
            'EntW',
            'Regl',
            'Alph',
            'SrTp',
            'Cont',
            'DtSt',
            'Date 1',
            'Date 2',
          ],
        },
        {
          position6: [
            'g',
            'g',
            'g',
            'g',
            'g',
            'g',
            'g',
            'k',
            'k',
            'k',
            'k',
            'k',
            'k',
            'k',
            'r',
            'r',
            'r',
            'r',
            'r',
            'r',
            'r',
          ],
          position7: [
            'a',
            'b',
            'c',
            'd',
            'i',
            'm',
            's',
            'a',
            'b',
            'c',
            'd',
            'i',
            'm',
            's',
            'a',
            'b',
            'c',
            'd',
            'i',
            'm',
            's',
          ],
          fields008: [
            'Srce',
            'Audn',
            'Lang',
            'Form',
            'GPub',
            'MRec',
            'Ctry',
            'Tech',
            'TMat',
            'Time',
            'DtSt',
            'Date 1',
            'Date 2',
          ],
        },
        {
          position6: ['a', 'a', 'a', 'a', 'a', 'a', 'a'],
          position7: ['a', 'b', 'c', 'd', 'i', 'm', 's'],
          fields008: ['Srce', 'Lang', 'Form', 'MRec', 'Ctry', 'DtSt', 'Date 1', 'Date 2'],
        },
      ];

      const marcFile = {
        marc: 'marcBibFileForC388651.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };

      const instanceID = [];

      before('Create user and data', () => {
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
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });

          InventoryInstances.searchByTitle('C388651 The Journal of ecclesiastical history.');
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();

          changesForLDR.forEach((change) => {
            for (let i = 0; i < change.position6.length; i++) {
              const newContent = replaceByIndex(
                replaceByIndex(initialLDRValue, 6, change.position6[i]),
                7,
                change.position7[i],
              );
              QuickMarcEditor.updateExistingField('LDR', newContent);
              QuickMarcEditor.check008FieldLabels(change.fields008);
            }
            // wait for all changes complete in LDR field.
            cy.wait(2000);
            QuickMarcEditor.pressSaveAndKeepEditing(changesSavedCallout);
          });

          QuickMarcEditor.closeEditorPane();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.check008FieldLabels(changesForLDR[5].fields008);
        },
      );
    });
  });
});
