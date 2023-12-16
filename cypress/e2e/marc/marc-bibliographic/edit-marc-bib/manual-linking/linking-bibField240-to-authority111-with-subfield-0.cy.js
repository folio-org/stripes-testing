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
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    createdRecordIDs: [],
    tag100: '111',
    tag240: '240',
    tag240content: '$a C380746 Conf on Security & Cooperation in Europe $c H. Finland $0 n88606074',
    filterStateTag111: [
      'advancedSearch',
      'keyword==C380746 Conf on Security & Cooperation in Europe or identifiers.value==n88606074',
    ],
    markedValue: 'C380746 Conference on Security and Cooperation in Europe',
    authority010FieldValue: 'n  88606074',
    authority111FieldValue: 'C380746 Conference on Security and Cooperation in Europe',
    authorityIconText: 'Linked to MARC authority',
    calloutMessage:
      'This record has successfully saved and is in process. Changes may not appear immediately.',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC380746.mrc',
      fileName: `C380746 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
      instanceAlternativeTitle: 'Final Act (1972-1975 : English',
    },
    {
      marc: 'marcAuthFileC380746.mrc',
      fileName: `C380746 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];
  const bib240AfterLinkingToAuth111 = [
    12,
    testData.tag240,
    '1',
    '\\',
    '$a Final Act $d (1972-1975 : $l English',
    '$c H. Finland',
    '$0 id.loc.gov/authorities/names/n88606074',
    '',
  ];
  const bib240AfterUninkingToAuth111 = [
    12,
    testData.tag240,
    '1',
    '\\',
    '$a Final Act $d (1972-1975 : $l English $c H. Finland $0 id.loc.gov/authorities/names/n88606074',
  ];

  before('Creating test data', () => {
    // make sure there are no duplicate authority records in the system
    cy.getAdminToken();
    MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C380746"' }).then(
      (records) => {
        records.forEach((record) => {
          if (record.authRefType === 'Authorized') {
            MarcAuthority.deleteViaAPI(record.id);
          }
        });
      },
    );

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

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
      InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
    });
  });

  it(
    'C380746 Link the "240" of "MARC Bib" field (having $0 without base URL) with "111" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.clickLinkIconInTagField(12);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthoritiesSearch.verifyFiltersState(
        testData.filterStateTag111[0],
        testData.filterStateTag111[1],
        'Search',
      );
      MarcAuthority.contains(testData.authority010FieldValue);
      MarcAuthority.contains(testData.authority111FieldValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib240AfterLinkingToAuth111);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.verifyAlternativeTitle(
        0,
        1,
        `${testData.authorityIconText}${marcFiles[0].instanceAlternativeTitle}`,
      );
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.checkFieldsExist([testData.tag240]);
      QuickMarcEditor.clickUnlinkIconInTagField(12);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib240AfterUninkingToAuth111);
      QuickMarcEditor.verifyIconsAfterUnlinking(12);
      QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
      // need to wait until the instance will be updated
      cy.wait(1500);
    },
  );
});
