import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  const testData = {
    marcAuthIcon: 'Linked to MARC authority',
    calloutAfterLinking:
      'Field 100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC387538.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC387538.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 20,
    },
  ];

  const createdAuthorityIDs = [];

  const linkableFields = [
    100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811,
    830,
  ];

  const fields = [
    {
      rowIndex: 33,
      tag: '100',
      naturalId: 'n2008001084',
      value: 'C387538 Coates, Ta-Nehisi',
      type: 'Contributor',
    },
    {
      rowIndex: 34,
      tag: '110',
      naturalId: 'no2006108277',
      value: 'C387538 Black Panther Fugitives (Musical group)',
      type: 'Contributor',
    },
    {
      rowIndex: 35,
      tag: '111',
      naturalId: 'no2009176429',
      value: 'C387538 Pimedate Ööde Filmifestival',
      type: 'Contributor',
    },
    {
      rowIndex: 36,
      tag: '130',
      naturalId: 'n80026980',
      value: 'C387538 Marvel comics',
      type: 'Title data',
    },
    {
      rowIndex: 37,
      tag: '240',
      naturalId: 'no2020024230',
      value: 'C387538 Black Panther',
      type: 'Title data',
    },
    {
      rowIndex: 65,
      tag: '600',
      naturalId: 'n2016004081',
      value: 'C387538 Black Panther (Fictitious character)',
      type: 'Subject',
    },
    {
      rowIndex: 60,
      tag: '610',
      naturalId: 'nb2009024488',
      value: 'C387538 Black Panther Movement',
      type: 'Subject',
    },
    {
      rowIndex: 61,
      tag: '611',
      naturalId: 'n82216757',
      value: 'C387538 Panther Photographic International',
      type: 'Subject',
    },
    {
      rowIndex: 62,
      tag: '630',
      naturalId: 'no2023006889',
      value: 'C387538 Black Panther, Wakanda forever (Motion picture)',
      type: 'Subject',
    },
    {
      rowIndex: 67,
      tag: '650',
      naturalId: 'sh2009125989',
      value: 'C387538 Good and evil',
      type: 'Subject',
    },
    {
      rowIndex: 71,
      tag: '651',
      naturalId: 'sh85001531',
      value: 'C387538 Africa',
      type: 'Subject',
    },
    {
      rowIndex: 73,
      tag: '655',
      naturalId: 'gf2014026266',
      value: 'C387538 Comics (Graphic works)',
      type: 'Subject',
    },
    {
      rowIndex: 86,
      tag: '700',
      naturalId: 'n83169267',
      value: 'C387538 Lee, Stan, 1922-2018',
      type: 'Contributor',
    },
    {
      rowIndex: 88,
      tag: '710',
      naturalId: 'no2008081921',
      value: 'C387538 Robinson & Associates, Inc',
      type: 'Contributor',
    },
    {
      rowIndex: 89,
      tag: '711',
      naturalId: 'n84745425',
      value:
        'C387538 Delaware Symposium on Language Studies. 1985 Delaware symposia on language studies',
      type: 'Contributor',
    },
    {
      rowIndex: 90,
      tag: '730',
      naturalId: 'n79066095',
      value: 'C387538 Lee, Stan, 1922-2018',
      type: 'Contributor',
    },
    {
      rowIndex: 91,
      tag: '800',
      naturalId: 'n79023811',
      value: 'C387538 Neilson, Donald, 1936-2011',
      type: 'Title data',
    },
    {
      rowIndex: 92,
      tag: '810',
      naturalId: 'n80095585',
      value: 'C387538 Black Panther Party',
      type: 'Title data',
    },
    {
      rowIndex: 93,
      tag: '811',
      naturalId: 'no2018125587',
      value: 'C387538 Stockholm International Film Festival',
      type: 'Title data',
    },
    {
      rowIndex: 94,
      tag: '830',
      naturalId: 'no2018018754',
      value: 'C387538 Black Panther (Motion picture : 2018)',
      type: 'Title data',
    },
  ];

  before('Creating user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
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
          },
        );
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    createdAuthorityIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C387538 All linkable fields are linked after clicking on the "Link headings" button when edit "MARC bib" (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      linkableFields.forEach((tag) => {
        QuickMarcEditor.setRulesForField(tag, true);
      });
      fields.forEach((matchs) => {
        QuickMarcEditor.verifyTagWithNaturalIdExistance(
          matchs.rowIndex,
          matchs.tag,
          matchs.naturalId,
          `records[${matchs.rowIndex}].content`,
        );
      });
      QuickMarcEditor.checkLinkHeadingsButton();
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(testData.calloutAfterLinking);
      fields.forEach((matchs) => {
        QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(matchs.rowIndex);
      });
      QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      fields.forEach((field) => {
        InventoryInstance.verifyRecordAndMarcAuthIcon(
          field.type,
          `${testData.marcAuthIcon}\n${field.value}`,
        );
      });

      InventoryInstance.viewSource();
      fields.forEach((field) => {
        InventoryViewSource.contains(`${testData.marcAuthIcon}\n\t${field.tag}`);
      });
      InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
      InventoryInstance.marcAuthViewIconClickUsingId(createdAuthorityIDs[1]);
    },
  );
});
