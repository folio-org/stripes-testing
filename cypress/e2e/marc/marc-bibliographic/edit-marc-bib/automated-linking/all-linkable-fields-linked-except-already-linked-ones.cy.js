import TestTypes from '../../../../../support/dictionary/testTypes';
import DevTeams from '../../../../../support/dictionary/devTeams';
import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  let userData = {};
  const marcAuthIcon = 'Linked to MARC authority';

  const marcFiles = [
    {
      marc: 'marcBibFileForC388534.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388534.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 20,
    },
  ];

  const linkingTagAndValues = [
    {
      rowIndex: 86,
      value: 'C388534 Lee, Stan, 1922-2018,',
      tag: 700,
      boxFourth: '$a C388534 Lee, Stan, $d 1922-2018',
      boxFifth: '$e creator.',
      boxSixth: '$0 id.loc.gov/authorities/names/n83169267C388534',
      boxSeventh: '',
    },
    {
      rowIndex: 88,
      value: 'C388534 Robinson & Associates, Inc.',
      tag: 710,
      boxFourth: '$a C388534 Robinson & Associates, Inc.',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/no2008081921C388534',
      boxSeventh: '',
    },
    {
      rowIndex: 89,
      value:
        'C388534 Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
      tag: 711,
      boxFourth:
        '$a C388534 Delaware Symposium on Language Studies. $f 1985 $t Delaware symposia on language studies',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/n84745425C388534',
      boxSeventh: '',
    },
    {
      rowIndex: 90,
      value: 'C388534 Gone with the wind (Motion picture : 1939)',
      tag: 730,
      boxFourth: '$a C388534 Gone with the wind $f 1939) $g (Motion picture :',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/n79066095C388534',
      boxSeventh: '',
    },
  ];

  const fields = [
    {
      rowIndex: 33,
      tag: '100',
      naturalId: 'n2008001084C388534',
    },
    {
      rowIndex: 34,
      tag: '110',
      naturalId: 'no2006108277C388534',
    },
    {
      rowIndex: 35,
      tag: '111',
      naturalId: 'no2009176429C388534',
    },
    {
      rowIndex: 36,
      tag: '130',
      naturalId: 'n80026980C388534',
    },
    {
      rowIndex: 37,
      tag: '240',
      naturalId: 'no2020024230C388534',
    },
    {
      rowIndex: 65,
      tag: '600',
      naturalId: 'n2016004081C388534',
    },
    {
      rowIndex: 60,
      tag: '610',
      naturalId: 'nb2009024488C388534',
    },
    {
      rowIndex: 61,
      tag: '611',
      naturalId: 'n82216757C388534',
    },
    {
      rowIndex: 62,
      tag: '630',
      naturalId: 'no2023006889C388534',
    },
    {
      rowIndex: 67,
      tag: '650',
      naturalId: 'sh2009125989C388534',
    },
    {
      rowIndex: 71,
      tag: '651',
      naturalId: 'sh85001531C388534',
    },
    {
      rowIndex: 73,
      tag: '655',
      naturalId: 'gf2014026266C388534',
    },
    {
      rowIndex: 91,
      tag: '800',
      naturalId: 'n79023811C388534',
    },
    {
      rowIndex: 92,
      tag: '810',
      naturalId: 'n80095585C388534',
    },
    {
      rowIndex: 93,
      tag: '811',
      naturalId: 'no2018125587C388534',
    },
    {
      rowIndex: 94,
      tag: '830',
      naturalId: 'no2018018754C388534',
    },
  ];

  const createdRecordsIDs = [];

  const linkableFields = [
    100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811,
    830,
  ];

  before('Creating user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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
              createdRecordsIDs.push(link.split('/')[5]);
            });
          }
        });
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstance.searchByTitle(createdRecordsIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();

        linkableFields.forEach((tag) => {
          QuickMarcEditor.setRulesForField(tag, true);
        });
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

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
    createdRecordsIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C388534 All linkable fields are linked after clicking on the "Link headings" button when edit "MARC bib" except already linked fields (spitfire) (TaaS)',
    { tags: [TestTypes.smoke, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdRecordsIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      fields.forEach((matchs) => {
        QuickMarcEditor.verifyTagWithNaturalIdExistance(
          matchs.rowIndex,
          matchs.tag,
          matchs.naturalId,
          `records[${matchs.rowIndex}].content`,
        );
      });
      linkingTagAndValues.forEach((field) => {
        QuickMarcEditor.verifyTagFieldAfterLinking(
          field.rowIndex,
          `${field.tag}`,
          '1',
          '\\',
          field.boxFourth,
          field.boxFifth,
          field.boxSixth,
          field.boxSeventh,
        );
      });
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(
        'Field 100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
      );
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      linkingTagAndValues.forEach((field) => {
        QuickMarcEditor.verifyTagFieldAfterLinking(
          field.rowIndex,
          `${field.tag}`,
          '1',
          '\\',
          field.boxFourth,
          field.boxFifth,
          field.boxSixth,
          field.boxSeventh,
        );
      });
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      InventoryInstance.viewSource();
      fields.forEach((field) => {
        InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
      });
      linkingTagAndValues.forEach((field) => {
        InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
      });
    },
  );
});
