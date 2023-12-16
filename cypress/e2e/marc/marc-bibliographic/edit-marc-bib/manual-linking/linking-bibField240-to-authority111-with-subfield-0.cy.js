import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
// import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
// import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
// import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
// import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    createdRecordIDs: [],
    tag100: '111',
    tag240: '240',
    // newTag240Content: '$a C374111 Testing $g European Economic Community, $d 1977 Jan. 18',
    // authority110FieldValue: 'C374111 Egypt.',
    // authorityIconText: 'Linked to MARC authority',
    // calloutMessage:
    //   'This record has successfully saved and is in process. Changes may not appear immediately.',
    // accordion: 'Title data',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC380746.mrc',
      fileName: `C380746 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
      // instanceAlternativeTitle:
      //   'Treaties, etc. Israel, 1978 September 17 (Framework for Peace in the Middle East)',
    },
    {
      marc: 'marcAuthFileC380746.mrc',
      fileName: `C380746 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];
  // const bib240AfterLinkingToAuth110 = [
  //   11,
  //   testData.tag240,
  //   '1',
  //   '0',
  //   '$a Treaties, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East)',
  //   '',
  //   '$0 id.loc.gov/authorities/names/n91006627',
  //   '',
  // ];
  // const bib240AfterUninkingToAuth110 = [
  //   11,
  //   testData.tag240,
  //   '1',
  //   '0',
  //   '$a Treaties, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East) $0 id.loc.gov/authorities/names/n91006627',
  // ];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                testData.createdRecordIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  // after('Deleting created user', () => {
  //   cy.getAdminToken().then(() => {
  //     Users.deleteViaApi(testData.userProperties.userId);
  //     InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
  //     createdAuthorityIDs.forEach((id, index) => {
  //       if (index) MarcAuthority.deleteViaAPI(id);
  //     });
  //   });
  // });

  it(
    'C380746 Link the "240" of "MARC Bib" field (having $0 without base URL) with "111" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
    },
  );
});
