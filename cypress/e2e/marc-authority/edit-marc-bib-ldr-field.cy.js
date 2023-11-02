import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import getRandomPostfix, { replaceByIndex } from '../../support/utils/stringTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
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
        'Start date',
        'End date',
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
        'Start date',
        'End date',
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
        'Start date',
        'End date',
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
        'Start date',
        'End date',
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
        'Start date',
        'End date',
      ],
    },
    {
      position6: ['a', 'a', 'a', 'a', 'a', 'a', 'a'],
      position7: ['a', 'b', 'c', 'd', 'i', 'm', 's'],
      fields008: ['Srce', 'Lang', 'Form', 'MRec', 'Ctry', 'DtSt', 'Start date', 'End date'],
    },
  ];

  const marcFile = {
    marc: 'marcBibFileForC388651.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  const instanceID = [];

  before('Create user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          instanceID.push(link.split('/')[5]);
        });
      });
    });
  });

  after('Delete user and data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(instanceID[0]);
  });

  it(
    'C388651 "008" field updated when valid LDR 06-07 combinations entered when editing "MARC bib" record (spitfire)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });

      InventoryInstance.searchByTitle('C388651 The Journal of ecclesiastical history.');
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
