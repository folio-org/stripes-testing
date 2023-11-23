import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'Test: created record with all linkable fields',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    marcAuthIcon: 'Linked to MARC authority',
  };

  const newFields = [
    {
      rowIndex: 4,
      tag: '100',
      content: '$a C389483 Coates, Ta-Nehisi,$eauthor. $0 n2008001084C389483',
      value: 'C389483 Coates, Ta-Nehisi',
      type: 'Contributor',
    },
    {
      rowIndex: 5,
      tag: '110',
      content: '$a C389483 Black Panther (MG) $0 no2006108277C389483',
      value: 'C389483 Black Panther Fugitives (Musical group)',
      type: 'Contributor',
    },
    {
      rowIndex: 6,
      tag: '111',
      content: '$a C389483 Pimedate Ööde Filmifestival $0 no2009176429C389483',
      value: 'C389483 Pimedate Ööde Filmifestival',
      type: 'Contributor',
    },
    {
      rowIndex: 7,
      tag: '130',
      content: '$a C389483 Marvel comics $0 n80026980C389483',
      value: 'C389483 Marvel comics',
      type: 'Title data',
    },
    {
      rowIndex: 8,
      tag: '240',
      content: '$a C389483 Black Panther $0 no2020024230C389483',
      value: 'C389483 Black Panther',
      type: 'Title data',
    },
    {
      rowIndex: 9,
      tag: '600',
      content: '$a C389483 Black Panther $c (Fictitious character) $2 fast $0 n2016004081C389483',
      value: 'C389483 Black Panther (Fictitious character)',
      type: 'Subject',
    },
    {
      rowIndex: 10,
      tag: '610',
      content: '$a C389483 Black Panther $0 nb2009024488C389483',
      value: 'C389483 Black Panther Movement',
      type: 'Subject',
    },
    {
      rowIndex: 11,
      tag: '611',
      content: '$a C389483 Panther Photographic $0 n82216757C389483',
      value: 'C389483 Panther Photographic International',
      type: 'Subject',
    },
    {
      rowIndex: 12,
      tag: '630',
      content: '$a C389483 Black Panther $0 no2023006889C389483',
      value: 'C389483 Black Panther, Wakanda forever (Motion picture)',
      type: 'Subject',
    },
    {
      rowIndex: 13,
      tag: '650',
      content: '$a C389483 Good and evil. $2 fast $0 sh2009125989C389483',
      value: 'C389483 Good and evil',
      type: 'Subject',
    },
    {
      rowIndex: 14,
      tag: '651',
      content: '$a C389483 Africa. $2 fast $0 sh85001531C389483',
      value: 'C389483 Africa',
      type: 'Subject',
    },
    {
      rowIndex: 15,
      tag: '655',
      content: '$a C389483 Comics (Graphic works) $2 fast $0 gf2014026266C389483',
      value: 'C389483 Comics (Graphic works)',
      type: 'Subject',
    },
    {
      rowIndex: 16,
      tag: '700',
      content:
        '$a C389483 Lee, Stan, $d 1922-2018, $e creator.$0 http://id.loc.gov/authorities/names/n83169267C389483',
      value: 'C389483 Lee, Stan, 1922-2018',
      type: 'Contributor',
    },
    {
      rowIndex: 17,
      tag: '710',
      content: '$a C389483 Robinson $0 no2008081921C389483',
      value: 'C389483 Robinson & Associates, Inc',
      type: 'Contributor',
    },
    {
      rowIndex: 18,
      tag: '711',
      content: '$a C389483 Delaware $0 n84745425C389483',
      value:
        'C389483 Delaware Symposium on Language Studies. 1985 Delaware symposia on language studies',
      type: 'Contributor',
    },
    {
      rowIndex: 19,
      tag: '730',
      content: '$a C389483 Gone T $0 n79066095C389483',
      value: 'C389483 Neilson, Donald, 1936-2011',
      type: 'Title data',
    },
    {
      rowIndex: 20,
      tag: '800',
      content: '$a C389483 Neilson, Donald $0 n79023811C389483',
      value: 'C389483 Neilson, Donald, 1936-2011',
      type: 'Title data',
    },
    {
      rowIndex: 21,
      tag: '810',
      content: '$a C389483 Black Panther Party $0 n80095585C389483',
      value: 'C389483 Black Panther Party',
      type: 'Title data',
    },
    {
      rowIndex: 22,
      tag: '811',
      content: '$a C389483 Stockholm International Film Festival $0 no2018125587C389483',
      value: 'C389483 Stockholm International Film Festival',
      type: 'Title data',
    },
    {
      rowIndex: 23,
      tag: '830',
      content: '$a C389483 Black Panther $0 no2018018754C389483',
      value: 'C389483 Black Panther (Motion picture : 2018)',
      type: 'Title data',
    },
  ];

  let userData = {};

  const marcFiles = [
    {
      marc: 'marcAuthFileForC389483.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 20,
    },
  ];

  const createdAuthorityIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

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
              createdAuthorityIDs.push(link.split('/')[5]);
            });
          }
        });
      });
    });
  });

  after('Deleting created users, Instances', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    for (let i = 0; i < 20; i++) {
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
    }
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[20]);
  });

  it(
    'C389483 All linkable fields are linked after clicking on the "Link headings" button when create "MARC bib" (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      newFields.forEach((newField) => {
        MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
      });
      // wait for fields to be filled in
      cy.wait(2000);
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(
        'Field 100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
      );
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      newFields.forEach((field) => {
        InventoryInstance.verifyRecordAndMarcAuthIcon(
          field.type,
          `${testData.marcAuthIcon}\n${field.value}`,
        );
      });
      InventoryInstance.getId().then((id) => {
        createdAuthorityIDs.push(id);
      });
      InventoryInstance.viewSource();
      newFields.forEach((field) => {
        InventoryViewSource.contains(`${testData.marcAuthIcon}\n\t${field.tag}`);
      });
    },
  );
});
