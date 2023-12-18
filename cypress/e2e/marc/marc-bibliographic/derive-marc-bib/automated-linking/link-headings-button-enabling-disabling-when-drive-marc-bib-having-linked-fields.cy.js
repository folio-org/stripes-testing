import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  const testData = {
    tag700: '700',
    tag337: '337',
    ta337content: '$a video $b v $2 rdamedia $0 n91074080',
    tag130seventhBoxContent: '$0 n91074080',
    tag700content: '$a Roberts, Julia, $d 1967- $e Actor. $0 n91074080333',
    newTag700content: '$a Roberts, Julia, $d 1967- $e Actor. $0 n91074080',
    createdRecordIDs: [],
    errorCalloutMessage: 'Field 700 must be set manually by selecting the link icon.',
    successCalloutMessage: 'Field 700 has been linked to MARC authority record(s).',
    bib130AfterLinkingToAuth100: [
      17,
      '130',
      '0',
      '\\',
      '$a C388561 Runaway Bride (Motion picture)',
      '',
      '$0 id.loc.gov/authorities/names/n2002076264',
      '$0 n91074080',
    ],
    bib700AfterLinkingToAuth100: [
      56,
      '700',
      '1',
      '\\',
      '$a C388561 Roberts, Julia, $d 1967-',
      '$e Actor.',
      '$0 id.loc.gov/authorities/names/n91074080',
      '',
    ],
    bib700_1AfterLinkingToAuth100: [
      57,
      '700',
      '1',
      '\\',
      '$a C388561 Gere, Richard, $d 1949-',
      '$e Actor.',
      '$0 id.loc.gov/authorities/names/n86041334',
      '',
    ],
    bib700AfterUnlinking: [
      57,
      '700',
      '1',
      '\\',
      '$a C388561 Gere, Richard, $d 1949- $e Actor. $0 id.loc.gov/authorities/names/n86041334',
    ],
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC388561.mrc',
      fileName: `C388561 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388561_1.mrc',
      fileName: `C388561 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388561_2.mrc',
      fileName: `C388561 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388561_3.mrc',
      fileName: `C388561 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];
  const linkingTagAndValues = [
    {
      rowIndex: 17,
      value: 'C388561 Runaway Bride (Motion picture)',
      tag: 130,
    },
    {
      rowIndex: 57,
      value: 'C388561 Gere, Richard',
      tag: 700,
    },
  ];

  before('Creating user and data', () => {
    // make sure there are no duplicate authority records in the system before auto-linking
    cy.getAdminToken();
    MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C388561"' }).then(
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
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.loginAsAdmin().then(() => {
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
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        linkingTagAndValues.forEach((linking) => {
          QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(linking.value);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
        });
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting user, data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    testData.createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C388561 "Link headings" button enabling/disabling when derive "MARC bib" having linked fields (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.deriveNewMarcBibRecord();
      cy.wait(1500);
      QuickMarcEditor.clickKeepLinkingButton();
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();

      QuickMarcEditor.updateExistingField(testData.tag337, testData.ta337content);
      QuickMarcEditor.checkContent(testData.ta337content, 22);
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.fillLinkedFieldBox(17, 7, testData.tag130seventhBoxContent);
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib130AfterLinkingToAuth100);
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();

      QuickMarcEditor.clickUnlinkIconInTagField(57);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib700AfterUnlinking);
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();

      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(testData.successCalloutMessage);
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib700_1AfterLinkingToAuth100);

      QuickMarcEditor.updateExistingFieldContent(56, testData.tag700content);
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();

      QuickMarcEditor.deleteField(56);
      QuickMarcEditor.afterDeleteNotification(testData.tag700);
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(56, testData.tag700);
      QuickMarcEditor.checkContent(testData.tag700content, 56);
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();

      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
      QuickMarcEditor.closeCallout();
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();

      QuickMarcEditor.updateExistingFieldContent(56, testData.newTag700content);
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(testData.successCalloutMessage);
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib700AfterLinkingToAuth100);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyAfterDerivedMarcBibSave();
      cy.wait(3000);
      InventoryInstance.viewSource();
      [17, 56, 57].forEach((index) => {
        InventoryViewSource.verifyLinkedToAuthorityIcon(index - 3, true);
      });
    },
  );
});
