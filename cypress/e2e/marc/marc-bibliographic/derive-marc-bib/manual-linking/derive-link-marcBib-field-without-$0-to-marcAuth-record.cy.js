import uuid from 'uuid';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import getRandomStringCode from '../../../../../support/utils/genereteTextCode';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
// import Users from '../../../../../support/fragments/users/users';

describe('MARC -> MARC Bibliographic -> Derive MARC bib -> Manual linking', () => {
  const testData = {
    createdRecordIDs: [],
    authoritySourceFile: {
      id: uuid(),
      name: `Test_source_browse_C365110${getRandomPostfix()}`,
      codes: [getRandomStringCode(4)],
      type: 'Personal Name',
      baseUrl: `id.loc.gov/authorities/personalname/test${getRandomPostfix()}`,
      source: 'local',
    },
    marcBibFile: {
      marc: 'marcBibFileForC365595.mrc',
      fileName: `C365595 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    marcAuthFile: {
      marc: 'marcAuthFileForC365595.mrc',
      fileName: `C365595 testMarcFile${getRandomPostfix()}.mrc`,
      editedFileName: `C365595 marcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  };

  before('Creating test data', () => {
    // make sure there are no duplicate authority records in the system
    // cy.getAdminToken().then(() => {
    // MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C365595"' }).then(
    //   (records) => {
    //     records.forEach((record) => {
    //       if (record.authRefType === 'Authorized') {
    //         MarcAuthority.deleteViaAPI(record.id);
    //       }
    //     });
    //   },
    // );
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    });
    // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
    DataImport.verifyUploadState();
    DataImport.uploadFileAndRetry(testData.marcBibFile.marc, testData.marcBibFile.fileName);
    JobProfiles.waitLoadingList();
    JobProfiles.search(testData.marcBibFile.jobProfileToRun);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(testData.marcBibFile.fileName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(testData.marcBibFile.fileName);
    for (let i = 0; i < testData.marcBibFile.numOfRecords; i++) {
      Logs.getCreatedItemsID(i).then((link) => {
        testData.createdRecordIDs.push(link.split('/')[5]);
      });
    }
    // });

    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });
  });

  // after('Deleting created user and data', () => {
  //   cy.getAdminToken();
  //   Users.deleteViaApi(testData.user.userId);
  //   InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
  //   MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
  // });

  it(
    'C365595 Derive | Link "MARC Bib" field without "$0" subfield to "MARC Authority" record. "Authority source file" value created by user (700 field to 100) (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      cy.getAdminToken();
      MarcAuthority.createAuthoritySource(testData.authoritySourceFile).then(() => {
        DataImport.editMarcFile(
          testData.marcAuthFile.marc,
          testData.marcAuthFile.editedFileName,
          ['PLKV'],
          testData.authoritySourceFile.codes,
        );

        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(
          testData.marcAuthFile.editedFileName,
          testData.marcAuthFile.fileName,
        );
        JobProfiles.waitLoadingList();
        JobProfiles.search(testData.marcAuthFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.marcAuthFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(testData.marcAuthFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          testData.createdRecordIDs.push(link.split('/')[5]);
        });

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.deriveNewMarcBibRecord();
        QuickMarcEditor.checkLinkButtonExistByRowIndex(56);
        QuickMarcEditor.verifyTagFieldAfterLinking(
          // ...testData.bib100AfterLinkingToAuth100
          56,
          '700',
          '1',
          '\\',
          '$a Stelfreeze, Brian, $e artist.',
        );
        QuickMarcEditor.clickLinkIconInTagField(56);
        MarcAuthorities.switchToBrowse();
        MarcAuthorities.searchByParameter('Heading/Reference', 'C365595 Stelfreeze, Brian');
        MarcAuthorities.chooseAuthoritySourceOption('');
      });
    },
  );
});
