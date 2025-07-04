import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { randomizeArray } from '../../../../support/utils/arrays';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const alphabetLowerCase = 'abcdefghijklmnopqrstuvwxyz';
        const alphabetUpperCase = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase();
        const digits = '0123456789';
        const specialChars = "$&+,:;=?@#|'<>.-^* ()%!";
        const ldrSelectOptions = {
          Status: {
            a: 'a - Increase in encoding level',
            c: 'c - Corrected or revised',
            d: 'd - Deleted',
            n: 'n - New',
            p: 'p - Increase in encoding level from prepublication',
          },
          Ctrl: {
            '\\': '\\ - No specified type',
            a: 'a - Archival',
          },
          Desc: {
            '\\': '\\ - Non-ISBD',
            a: 'a - AACR2',
            c: 'c - ISBD punctuation omitted',
            i: 'i - ISBD punctuation included',
            n: 'n - Non-ISBD punctuation omitted',
            u: 'u - Unknown',
          },
          MultiLvl: {
            '\\': '\\ - Not specified or not applicable',
            a: 'a - Set',
            b: 'b - Part with independent title',
            c: 'c - Part with dependent title',
          },
        };
        const testData = {
          tags: {
            tag245: '245',
            tagLDR: 'LDR',
          },

          absent008Fields: ['ELvl', 'Desc'],

          fieldContents: {
            tag245ContentPrefix: 'Derived_Bib_',
            originalTitle:
              'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
          },

          LDRValues: {
            validLDR05Values: randomizeArray(['a', 'c', 'd', 'n', 'p', 'c']),
            validLDR08Values: randomizeArray(['\\', 'a', '\\', 'a', '\\', 'a']),
            validLDR17Values: randomizeArray([
              alphabetLowerCase[Math.floor(Math.random() * alphabetLowerCase.length)],
              alphabetUpperCase[Math.floor(Math.random() * alphabetUpperCase.length)],
              digits[Math.floor(Math.random() * digits.length)],
              specialChars[Math.floor(Math.random() * specialChars.length)],
              alphabetLowerCase[Math.floor(Math.random() * alphabetLowerCase.length)],
              alphabetUpperCase[Math.floor(Math.random() * alphabetUpperCase.length)],
              digits[Math.floor(Math.random() * digits.length)],
              specialChars[Math.floor(Math.random() * specialChars.length)],
            ]),
            validLDR18Values: randomizeArray(['\\', 'a', 'c', 'i', 'n', 'u']),
            validLDR19Values: randomizeArray(['\\', 'a', '\\', 'a', '\\', 'a']),
          },
        };

        const createdInstanceIDs = [];

        const marcFile = {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        };

        before(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.moduleDataImportEnabled.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdInstanceIDs.push(record[marcFile.propertyName].id);
              });
            });

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created user, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdInstanceIDs.forEach((instanceID) => {
            InventoryInstance.deleteInstanceViaApi(instanceID);
          });
        });

        it(
          'C357566 Verify "LDR" validation rules with valid data for positions 05, 08, 17, 18, 19 when deriving record (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C357566'] },
          () => {
            for (let i = 0; i < testData.LDRValues.validLDR18Values.length; i++) {
              cy.visit(`${TopMenu.inventoryPath}/view/${createdInstanceIDs[0]}`);
              InventoryInstance.checkInstanceTitle(testData.fieldContents.originalTitle);
              InventoryInstance.deriveNewMarcBib();
              QuickMarcEditor.waitLoading();
              QuickMarcEditor.check008FieldsAbsent(...testData.absent008Fields);
              const fieldValues = {
                Status: ldrSelectOptions.Status[testData.LDRValues.validLDR05Values[i]],
                Ctrl: ldrSelectOptions.Ctrl[testData.LDRValues.validLDR08Values[i]],
                ELvl: testData.LDRValues.validLDR17Values[i],
                Desc: ldrSelectOptions.Desc[testData.LDRValues.validLDR18Values[i]],
                MultiLvl: ldrSelectOptions.MultiLvl[testData.LDRValues.validLDR19Values[i]],
              };
              QuickMarcEditor.fillLDRFields(fieldValues);
              const title = testData.fieldContents.tag245ContentPrefix + getRandomPostfix();
              QuickMarcEditor.updateExistingField('245', `$a ${title}`);
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndCloseDerive();
              InventoryInstance.waitInventoryLoading();
              InventoryInstance.checkInstanceTitle(title);
              cy.url().then((url) => createdInstanceIDs.push(url.split('/')[5]));
              cy.wait(2000);
            }
          },
        );
      });
    });
  });
});
