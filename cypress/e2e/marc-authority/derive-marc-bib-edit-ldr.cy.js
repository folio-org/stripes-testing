import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import { randomizeArray } from '../../support/utils/arrays';
import DataImport from '../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../support/constants';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('MARC -> MARC Bibliographic -> Derive MARC bib', () => {
  const alphabetLowerCase = 'abcdefghijklmnopqrstuvwxyz';
  const alphabetUpperCase = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase();
  const digits = '0123456789';
  const specialChars = "$&+,:;=?@#|'<>.-^* ()%!";

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
      validLDR05Values: randomizeArray(['a', 'c', 'd', 'n', 'p', 'a', 'c', 'd', 'n', 'p']),
      validLDR08Values: randomizeArray([' ', '\\', 'a', ' ', '\\', 'a', ' ', '\\', 'a']),
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
      validLDR18Values: randomizeArray([' ', '\\', 'a', 'c', 'i', 'n', 'u']),
      validLDR19Values: randomizeArray([' ', '\\', 'a', ' ', '\\', 'a', ' ', '\\', 'a']),
    },
  };

  const createdInstanceIDs = [];

  const marcFile = {
    marc: 'oneMarcBib.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdInstanceIDs.push(link.split('/')[5]);
        });
      });
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user, Instances', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdInstanceIDs.forEach((instanceID) => {
      InventoryInstance.deleteInstanceViaApi(instanceID);
    });
  });

  it(
    'C357566 Verify "LDR" validation rules with valid data for positions 05, 08, 17, 18, 19 when deriving record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      for (let i = 0; i < testData.LDRValues.validLDR18Values.length; i++) {
        cy.visit(`${TopMenu.inventoryPath}/view/${createdInstanceIDs[0]}`);
        InventoryInstance.checkInstanceTitle(testData.fieldContents.originalTitle);
        InventoryInstance.deriveNewMarcBib();
        QuickMarcEditor.check008FieldsAbsent(...testData.absent008Fields);
        QuickMarcEditor.getRegularTagContent(testData.tags.tagLDR).then((content) => {
          const updatedLDRvalue = `${content.substring(0, 5)}${
            testData.LDRValues.validLDR05Values[i]
          }${content.substring(6, 8)}${testData.LDRValues.validLDR08Values[i]}${content.substring(
            9,
            17,
          )}${testData.LDRValues.validLDR17Values[i]}${testData.LDRValues.validLDR18Values[i]}${
            testData.LDRValues.validLDR19Values[i]
          }${content.substring(20)}`;
          const title = testData.fieldContents.tag245ContentPrefix + getRandomPostfix();
          QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${title}`);
          QuickMarcEditor.updateExistingField(testData.tags.tagLDR, updatedLDRvalue);
          QuickMarcEditor.checkContent(updatedLDRvalue, 0);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkInstanceTitle(title);
          cy.url().then((url) => createdInstanceIDs.push(url.split('/')[5]));
        });
      }
    },
  );
});
