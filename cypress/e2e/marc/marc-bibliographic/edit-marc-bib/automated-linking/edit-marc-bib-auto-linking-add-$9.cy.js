import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  let userData;
  const linkableFields = [
    100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811,
    830,
  ];
  const preLinkedFields = [
    {
      tag: '655',
      value: 'C388552 Autobiography',
      rowIndex: 41,
      content: '$a C388552 Autobiography',
      fifthBox: '$9 test333',
    },
    {
      tag: '655',
      value: 'C388552 Biographies',
      rowIndex: 43,
      content: '$a C388552 Biographies',
      seventhBox: '$9 acc6b9cb-c607-4a4f-8505-a0f1a4492211',
    },
  ];
  const editedFields = [
    {
      rowIndex: 17,
      tag: '100',
      initialContent: 'a Chin, Staceyann, $d 1972- $e author. $0 n 20080524049',
      newContent: 'a Chin, Staceyann, $d 1972- $e author. $0 n 20080524049 $9 test567',
    },
    {
      rowIndex: 30,
      tag: '650',
      initialContent: '$a Authors, Jamaican $y 21st century $v Biography. $0 sh 850099229',
      newContent:
        '$a Authors, Jamaican $y 21st century $v Biography. $0 sh 850099229 $9 acc6b9cb-c607-4a4f-8505-a0f1a4492233',
    },
    {
      rowIndex: 31,
      tag: '650',
      initialContent: '$a Lesbian authors $z Jamaica $v Biography. $0 sh 99014708',
      newContent:
        '$a C388552 Lesbian authors $z Jamaica $v Biography. $0 sh 99014708 $9 acc6b9cb-c607-4a4f-8505-a0f1a4492295',
    },
    {
      rowIndex: 32,
      tag: '650',
      initialContent: '$a Lesbian activists $z Jamaica $v Biography. $0 sh 96007532',
      newContent: '$a C388552 Lesbian activists $z Jamaica $v Biography. $0 sh 96007532 $9 test123',
    },
  ];
  const field050 = { rowIndex: 15, tag: '050', content: '' };
  const field082 = { rowIndex: 16, tag: '082', content: '$a 818/.6 $2 22 $9 test891' };
  const createdRecordIDs = [];
  const naturalIds = [
    'sh85010050',
    'sh96007532',
    'sh85009933',
    'gf2014026049',
    'n2008052404',
    'sh99014708',
  ];
  const marcFiles = [
    {
      marc: 'marcBibFileForC388552.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388552-1.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388552-2.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388552-3.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388552-4.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388552-5.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388552-6.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  before('Create test data', () => {
    // Making sure there are no duplicate authority records in the system before auto-linking
    cy.getAdminToken().then(() => {
      naturalIds.forEach((id) => {
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 200,
          query: `naturalId="${id}*" and authRefType=="Authorized"`,
        }).then((records) => {
          records.forEach((record) => {
            MarcAuthority.deleteViaAPI(record.id);
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;
    });

    linkableFields.forEach((field) => QuickMarcEditor.setRulesForField(field, true));
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
            createdRecordIDs.push(link.split('/')[5]);
          });
        }
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        preLinkedFields.forEach((field) => {
          QuickMarcEditor.clickLinkIconInTagField(field.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(field.value);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(field.tag, field.rowIndex);
        });
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(userData.userId);
      createdRecordIDs.forEach((id, index) => {
        if (index === 0) InventoryInstance.deleteInstanceViaApi(id);
        else MarcAuthority.deleteViaAPI(id);
      });
    });
  });

  it(
    'C388552 Add subfield "$9" in the fields before clicking on "Link headings" button when edit "MARC bib" with saved linked fields (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      // #1 Find and open detail view of "MARC Bib" record record from precondition, ex. of search query:
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      // #2 Click on "Actions" button in second pane → Select "Edit MARC bibliographic record" option
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      // #3-6 Edit fields which are eligible for linking
      editedFields.forEach((field) => {
        QuickMarcEditor.updateExistingFieldContent(field.rowIndex, field.newContent);
      });
      // #7 Edit field which is linked:
      QuickMarcEditor.fillLinkedFieldBox(
        preLinkedFields[0].rowIndex,
        5,
        preLinkedFields[0].fifthBox,
      );
      // #8 Edit field which is linked:
      QuickMarcEditor.fillLinkedFieldBox(
        preLinkedFields[1].rowIndex,
        7,
        preLinkedFields[1].seventhBox,
      );
      // #9 Edit field which is NOT eligible for linking:
      QuickMarcEditor.updateExistingFieldContent(field082.rowIndex, field082.content);
      // #10 Click on the "Link headings" button.
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout('Field 650 has been linked to MARC authority record(s).');
      QuickMarcEditor.checkCallout(
        'Field 100 and 650 must be set manually by selecting the link icon.',
      );
      preLinkedFields.forEach((field) => {
        QuickMarcEditor.verifyRowLinked(field.rowIndex, true);
        // "$9" were deleted from the fields automatically (fifth and seventh box)
      });
      editedFields.forEach((field, index) => {
        if (index > 1) {
          QuickMarcEditor.verifyRowLinked(field.rowIndex, true);
          QuickMarcEditor.checkContent(field.initialContent, field.rowIndex);
        } else {
          QuickMarcEditor.verifyRowLinked(field.rowIndex, false);
          QuickMarcEditor.checkContent(field.initialContent, field.rowIndex);
        }
      });
      QuickMarcEditor.checkContent(field050.content, field082.rowIndex);
      QuickMarcEditor.checkContent(field082.content, field082.rowIndex);
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      // #11 Click on the "Save & close" button.
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      // #12 Click on the "Actions" in the third pane >> "View source"
      InventoryInstance.viewSource();
      preLinkedFields.forEach((field) => {
        InventoryViewSource.verifyLinkedToAuthorityIcon(field.rowIndex, true);
      });
      editedFields.forEach((field, index) => {
        if (index > 1) {
          InventoryViewSource.verifyLinkedToAuthorityIcon(field.rowIndex, true);
        } else {
          InventoryViewSource.verifyLinkedToAuthorityIcon(field.rowIndex, false);
        }
      });
      // * Only one subfield "$9" is displayed in linked fields (in valid UUID format, matching to existing "MARC authority" record)
    },
  );
});
