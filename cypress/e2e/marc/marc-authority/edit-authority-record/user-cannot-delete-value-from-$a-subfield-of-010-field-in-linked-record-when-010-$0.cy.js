import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC -> MARC Authority -> Edit Authority record', () => {
  const testData = {
    tag010: '010',
    subfieldPrefix: '$a',
    tag010content: 'n  91074080 ',
    createdRecordIDs: [],
    searchOptions: {
      keyword: 'Keyword',
      nameTitle: 'C376936 Roberts',
    },
    errorMessage: 'Cannot remove 010 $a for this record.',
    bib700AfterLinkingToAuth100: [
      56,
      '700',
      '1',
      '\\',
      '$a C376936 Roberts, Julia, $d 1967-',
      '$e Actor.',
      '$0 id.loc.gov/authorities/names/n91074080',
      '',
    ],
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC376936.mrc',
      fileName: `C376936 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
      instanceTitle:
        'Runaway bride/ produced by Robert W. Cort, Ted Field, Scott Kroopf, Tom Rosenberg; written by Josann McGibbon, Sara Parriott; directed by Garry Marshall.',
    },
    {
      marc: 'marcAuthFileC376936.mrc',
      fileName: `C376936 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];
  const linkingTagAndValue = {
    rowIndex: 56,
    value: 'C376936 Roberts, Julia',
    tag: '700',
  };

  before('Create test data', () => {
    // make sure there are no duplicate authority records in the system
    cy.getAdminToken().then(() => {
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C376936"' }).then(
        (records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        },
      );
    });
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

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstance.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValue.rowIndex);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.verifySearchOptions();
        InventoryInstance.searchResults(linkingTagAndValue.value);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
          linkingTagAndValue.tag,
          linkingTagAndValue.rowIndex,
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
      MarcAuthorities.searchBy(testData.searchOptions.keyword, testData.searchOptions.nameTitle);
    });
  });

  after('Deleting created user and records', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
  });

  it(
    'C376936 Verify that user can not delete value from "$a" subfield of "010" field in linked "MARC Authority" record when "010" = "$0" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthority.edit();
      QuickMarcEditor.checkContent(`${testData.subfieldPrefix} ${testData.tag010content}`, 4);
      QuickMarcEditor.checkDeleteButtonNotExist(4);
      QuickMarcEditor.updateExistingField(testData.tag010, testData.subfieldPrefix);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      QuickMarcEditor.closeCallout();
      QuickMarcEditor.pressSaveAndKeepEditing(testData.errorMessage);
      QuickMarcEditor.closeCallout();
      QuickMarcEditor.pressCancel();
      QuickMarcEditor.closeWithoutSavingInEditConformation();
      MarcAuthorities.checkDetailViewIncludesText(
        `${testData.subfieldPrefix} ${testData.tag010content}`,
      );
      MarcAuthorities.closeMarcViewPane();
      MarcAuthorities.verifyNumberOfTitles(5, '1');
      MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
      InventoryInstance.checkInstanceTitle(marcFiles[0].instanceTitle);
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib700AfterLinkingToAuth100);
    },
  );
});
