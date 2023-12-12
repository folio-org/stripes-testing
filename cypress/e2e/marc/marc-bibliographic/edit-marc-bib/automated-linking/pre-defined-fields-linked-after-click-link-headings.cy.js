import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  let userData = {};

  const marcFiles = [
    {
      marc: 'marcBibFileForC389486.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC389486.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 22,
    },
  ];

  const linkingTagAndValues = [
    {
      rowIndex: 70,
      value: 'C389486 Superheroes',
      tag: 650,
      boxSecond: '\\',
      boxThird: '7',
      boxFourth: '$a C389486 Superheroes',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/subjects/sh2007009593',
      boxSeventh: '$2 fast',
    },
    {
      rowIndex: 85,
      value: 'C389486 Sabino, Joe',
      tag: 700,
      boxSecond: '1',
      boxThird: '\\',
      boxFourth: '$a C389486 Sabino, Joe',
      boxFifth: '$e letterer.',
      boxSixth: '$0 id.loc.gov/authorities/names/no2011137752',
      boxSeventh: '',
    },
  ];

  const fields = [
    {
      rowIndex: 33,
      tag: '100',
      naturalId: 'n2008001084C389486',
    },
    {
      rowIndex: 34,
      tag: '110',
      naturalId: 'no2006108277C389486',
    },
    {
      rowIndex: 35,
      tag: '111',
      naturalId: 'no2009176429C389486',
    },
    {
      rowIndex: 36,
      tag: '130',
      naturalId: 'n80026980C389486',
    },
    {
      rowIndex: 37,
      tag: '240',
      naturalId: 'no2020024230C389486',
    },
    {
      rowIndex: 65,
      tag: '600',
      naturalId: 'n2016004081C389486',
    },
    {
      rowIndex: 60,
      tag: '610',
      naturalId: 'nb2009024488C389486',
    },
    {
      rowIndex: 61,
      tag: '611',
      naturalId: 'n82216757C389486',
    },
    {
      rowIndex: 62,
      tag: '630',
      naturalId: 'no2023006889C389486',
    },
    {
      rowIndex: 67,
      tag: '650',
      naturalId: 'sh2009125989C389486',
    },
    {
      rowIndex: 71,
      tag: '651',
      naturalId: 'sh85001531C389486',
    },
    {
      rowIndex: 73,
      tag: '655',
      naturalId: 'gf2014026266C389486',
    },
    {
      rowIndex: 86,
      tag: '700',
      naturalId: 'n83169267C389486',
    },
    {
      rowIndex: 88,
      tag: '710',
      naturalId: 'no2008081921C389486',
    },
    {
      rowIndex: 89,
      tag: '711',
      naturalId: 'n  84745425C389486',
    },
    {
      rowIndex: 90,
      tag: '730',
      naturalId: 'n79066095C389486',
    },
    {
      rowIndex: 91,
      tag: '800',
      naturalId: 'n79023811C389486',
    },
    {
      rowIndex: 92,
      tag: '810',
      naturalId: 'n80095585C389486',
    },
    {
      rowIndex: 93,
      tag: '811',
      naturalId: 'no2018125587C389486',
    },
    {
      rowIndex: 94,
      tag: '830',
      naturalId: 'no2018018754C389486',
    },
  ];

  const createdRecordsIDs = [];

  const autoLinkingEnabledFields = [
    100, 110, 111, 130, 240, 700, 710, 711, 730, 800, 810, 811, 830,
  ];
  const autoLinkingDisabledFields = [600, 610, 611, 630, 650, 651, 655];
  const rowIndexOfLinkedFields = [33, 34, 35, 36, 37, 86, 88, 89, 90, 91, 92, 93, 94];

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
        InventoryInstances.searchByTitle(createdRecordsIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        autoLinkingEnabledFields.forEach((tag) => {
          QuickMarcEditor.setRulesForField(tag, true);
        });
        autoLinkingDisabledFields.forEach((tag) => {
          QuickMarcEditor.setRulesForField(tag, false);
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
    'C389486 Pre-defined fields are linked after clicking on the "Link headings" button in edit "MARC bib" when only default fields enabled for autolinking (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(createdRecordsIDs[0]);
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
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      linkingTagAndValues.forEach((field) => {
        QuickMarcEditor.verifyTagFieldAfterLinking(
          field.rowIndex,
          `${field.tag}`,
          field.boxSecond,
          field.boxThird,
          field.boxFourth,
          field.boxFifth,
          field.boxSixth,
          field.boxSeventh,
        );
      });
      QuickMarcEditor.updateExistingField(
        fields[0].tag,
        '$a Coates, Ta-Nehisi, $e author. $0n2008001084C389486',
      );
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(
        'Field 100, 110, 111, 130, 240, 700, 710, 730, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
      );
      QuickMarcEditor.checkCallout('Field 711 must be set manually by selecting the link icon.');
      linkingTagAndValues.forEach((field) => {
        QuickMarcEditor.verifyTagFieldAfterLinking(
          field.rowIndex,
          `${field.tag}`,
          field.boxSecond,
          field.boxThird,
          field.boxFourth,
          field.boxFifth,
          field.boxSixth,
          field.boxSeventh,
        );
      });
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingField(fields[14].tag, '$a Delaware $0 n84745425C389486');
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout('Field 711 has been linked to MARC authority record(s).');
      QuickMarcEditor.clickSaveAndKeepEditing();
      rowIndexOfLinkedFields.forEach((linkedField) => {
        QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(linkedField);
      });
      QuickMarcEditor.closeEditorPane();
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseContributors.select();
      BrowseContributors.browse(linkingTagAndValues[0].value);
      BrowseSubjects.checkRowWithValueAndAuthorityIconExists(linkingTagAndValues[1].value);

      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.searchBy('Keyword', linkingTagAndValues[1].value);
      MarcAuthorities.verifyNumberOfTitles(5, '1');
    },
  );
});
