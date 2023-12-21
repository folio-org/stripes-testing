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
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Manual linking', () => {
  const testData = {
    createdRecordIDs: [],
    tag700: '700',
    filterStateTag100: [
      'advancedSearch',
      'keyword==C380742 Lee, Stan, 1922-2018, or identifiers.value==n83169267',
    ],
    authority010FieldValue: 'n  83169267',
    authority100FieldValue: 'C380742 Lee, Stan,',
    // tag010: '010',
    // tag240: '240',
    // authority100FieldValue: 'Coates, Ta-Nehisi',
    // authority010FieldValue: 'n 2008001084',
    // successMsg:
    //   'This record has successfully saved and is in process. Changes may not appear immediately.',
    // accordion: 'Contributor',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380742.mrc',
      fileName: `C380742 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC380742.mrc',
      fileName: `C380742 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  before('Creating user', () => {
    // make sure there are no duplicate authority records in the system
    cy.getAdminToken().then(() => {
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C380742"' }).then(
        (records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        },
      );
    });
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.loginAsAdmin();
      marcFiles.forEach((marcFile) => {
        cy.visit(TopMenu.dataImportPath);
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
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  it(
    'C380742 Link "MARC Bib" field with "$0" subfield matched to "MARC Authority" record. "Authority source file" value from the pre-defined list (700 field to 100) (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.checkLinkButtonExistByRowIndex(79);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        79,
        '700',
        '1',
        '\\',
        '$a C380742 Lee, Stan, $d 1922-2018, $e creator. $0 http://id.loc.gov/authorities/names/n83169267',
      );
      QuickMarcEditor.clickLinkIconInTagField(79);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthoritiesSearch.verifyFiltersState(
        testData.filterStateTag100[0],
        testData.filterStateTag100[1],
        'Search',
      );
      // keyword==C380742 Lee, Stan, 1922-2018, or identifiers.value==n83169267
      // keyword containsAll C380742 Lee, Stan, or identifiers.value containsAll n83169267
      // MarcAuthority.contains(testData.authority010FieldValue);
      // MarcAuthority.contains(testData.authority100FieldValue);
      // MarcAuthorities.closeFindAuthorityModal();
      // QuickMarcEditor.updateExistingFieldContent(79, '$d C380742 Lee, Stan, $t 1922-2018, $e creator. $0 id.loc.gov/authorities/names/n83169267');

      // QuickMarcEditor.clickLinkIconInTagField(79);
      // InventoryInstance.verifySelectMarcAuthorityModal();
      // MarcAuthoritiesSearch.verifyFiltersState(
      //   testData.filterStateTag100[0],
      //   testData.filterStateTag100[1],
      //   'Search',
      // );
      // // MarcAuthority.contains(testData.authority010FieldValue);
      // // MarcAuthority.contains(testData.authority100FieldValue);

      // MarcAuthorities.checkLinkButtonToolTipText('Link "C380742 Lee, Stan, 1922-2018"');
      // InventoryInstance.clickLinkButton();
      // QuickMarcEditor.verifyAfterLinkingUsingRowIndex('700', 79);
      // QuickMarcEditor.verifyTagFieldAfterLinking(
      //   79,
      //   '700',
      //   '1',
      //   '\\',
      //   '$d 1922-2018 $a Lee, Stan,',
      //   '$e creator.',
      //   '$0 id.loc.gov/authorities/names/n83169267',
      //   ''
      // );
      // QuickMarcEditor.pressSaveAndKeepEditing('This record has successfully saved and is in process. Changes may not appear immediately.');
      // QuickMarcEditor.checkViewMarcAuthorityTooltipText(79);
      // QuickMarcEditor.clickViewMarcAuthorityIconInTagField(79);
      // MarcAuthorities.checkFieldAndContentExistence('100', 'C380742 Lee, Stan');
      // cy.go('back');
      // QuickMarcEditor.closeEditorPane();
      // InstanceRecordView.verifyInstancePaneExists();
      // InventoryInstance.verifyContributorWithMarcAppLink(1, 1, '1922-2018 Lee, Stan,');
      // InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane('Contributor');
      // InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane('Contributor');
      // MarcAuthorities.checkDetailViewIncludesText('1922-2018 Lee, Stan,');
      // cy.go('back');
      // InstanceRecordView.verifyInstancePaneExists();
      // InventoryInstance.viewSource();
      // InventoryViewSource.verifyLinkedToAuthorityIcon(76);

      // // MarcAuthorities.checkDetailViewIncludesText('C380742 Lee, Stan');
      // // cy.go('back');
      // // InventoryInstance.closeDetailsView();
    },
  );
});
