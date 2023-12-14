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
  let userData = {};
  const marcAuthIcon = 'Linked to MARC authority';

  const marcFiles = [
    {
      marc: 'marcBibFileForC388641.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388641.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 20,
    },
  ];

  const subjectHeadings = [
    'Black Panther Movement',
    'Panther Photographic International',
    'Black Panther, Wakanda forever (Motion picture)',
    'Black Panther (Fictitious character)',
    'Good and evil',
    'Africa',
    'Comics (Graphic works)',
  ];

  const alternativeTitles = ['Marvel comics', 'Black Panther'];

  const seriesList = [
    'Neilson, Donald, 1936-2011',
    'Black Panther Party',
    'Stockholm International Film Festival',
    'Black Panther (Motion picture : 2018)',
  ];

  const preLinkedFields = [
    {
      rowIndex: 86,
      value: 'C388641 Lee, Stan, 1922-2018,',
      tag: 700,
      boxFourth: '$a C388641 Lee, Stan, $d 1922-2018',
      boxFifth: '$e creator.',
      boxSixth: '$0 id.loc.gov/authorities/names/n83169267C388641',
      boxSeventh: '',
    },
    {
      rowIndex: 88,
      value: 'C388641 Robinson & Associates, Inc.',
      tag: 710,
      boxFourth: '$a C388641 Robinson & Associates, Inc.',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/no2008081921C388641',
      boxSeventh: '',
    },
    {
      rowIndex: 89,
      value:
        'C388641 Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
      tag: 711,
      boxFourth:
        '$a C388641 Delaware Symposium on Language Studies. $f 1985 $t Delaware symposia on language studies',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/n84745425C388641',
      boxSeventh: '',
    },
    {
      rowIndex: 90,
      value: 'C388641 Gone with the wind (Motion picture : 1939)',
      tag: 730,
      boxFourth: '$a C388641 Gone with the wind $f 1939) $g (Motion picture :',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/n79066095C388641',
      boxSeventh: '',
    },
  ];

  const linkedFields = [
    {
      rowIndex: 33,
      tag: '100',
      naturalId: 'n2008001084C388641',
    },
    {
      rowIndex: 34,
      tag: '110',
      naturalId: 'no2006108277C388641',
    },
    {
      rowIndex: 35,
      tag: '111',
      naturalId: 'no2009176429C388641',
    },
    {
      rowIndex: 36,
      tag: '130',
      naturalId: 'n80026980C388641',
    },
    {
      rowIndex: 37,
      tag: '240',
      naturalId: 'no2020024230C388641',
    },
    {
      rowIndex: 65,
      tag: '600',
      naturalId: 'n2016004081C388641',
    },
    {
      rowIndex: 60,
      tag: '610',
      naturalId: 'nb2009024488C388641',
    },
    {
      rowIndex: 61,
      tag: '611',
      naturalId: 'n82216757C388641',
    },
    {
      rowIndex: 62,
      tag: '630',
      naturalId: 'no2023006889C388641',
    },
    {
      rowIndex: 67,
      tag: '650',
      naturalId: 'sh2009125989C388641',
    },
    {
      rowIndex: 71,
      tag: '651',
      naturalId: 'sh85001531C388641',
    },
    {
      rowIndex: 73,
      tag: '655',
      naturalId: 'gf2014026266C388641',
    },
    {
      rowIndex: 91,
      tag: '800',
      naturalId: 'n79023811C388641',
    },
    {
      rowIndex: 92,
      tag: '810',
      naturalId: 'n80095585C388641',
    },
    {
      rowIndex: 93,
      tag: '811',
      naturalId: 'no2018125587C388641',
    },
    {
      rowIndex: 94,
      tag: '830',
      naturalId: 'no2018018754C388641',
    },
  ];

  const createdRecordsIDs = [];

  const linkableFields = [
    100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811,
    830,
  ];

  before('Creating user and data', () => {
    // make sure there are no duplicate authority records in the system before auto-linking
    cy.getAdminToken().then(() => {
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 200, query: 'naturalId="*C388641"' }).then(
        (records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        },
      );

      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C388641"' }).then(
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
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
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

        linkableFields.forEach((tag) => {
          QuickMarcEditor.setRulesForField(tag, true);
        });
        preLinkedFields.forEach((linking) => {
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
    'C388641 All linkable fields are linked after clicking on the "Link headings" button when edit "MARC bib" except already linked fields (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      // 1 Find and open detail view of "MARC Bib" record from precondition
      InventoryInstances.searchByTitle(createdRecordsIDs[0]);
      InventoryInstances.selectInstance();
      // 2 Click on "Actions" button in second pane →  Select "Derive new MARC bibliographic record" option
      InventoryInstance.deriveNewMarcBibRecord();
      // Click on the "Keep linking" option in appeared modal.
      QuickMarcEditor.clickKeepLinkingButton();
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      linkedFields.forEach((field) => {
        QuickMarcEditor.verifyTagWithNaturalIdExistance(
          field.rowIndex,
          field.tag,
          `$0 ${field.naturalId}`,
          `records[${field.rowIndex}].content`,
        );
      });
      preLinkedFields.forEach((field) => {
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
      // 3 Click on the "Link headings" button.
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(
        'Field 100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
      );
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      linkedFields.forEach((field) => {
        QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(field.rowIndex);
      });
      preLinkedFields.forEach((field) => {
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
      // 4 Click on the "Save & close" button.
      QuickMarcEditor.pressSaveAndClose();
      InventoryInstance.waitLoading();
      // 5 Scroll down to the "Subject" accordion button. "MARC authority" app icon is displayed next to each linked subject name
      subjectHeadings.forEach((heading) => {
        InventoryInstance.checkAuthorityAppIconInSection('list-subject', heading, true);
      });
      // 6 Click on any "MARC authority app" icon placed next to auto-linked subject name.
      InventoryInstance.checkAuthorityAppIconLink(
        'list-subject',
        subjectHeadings[0],
        createdRecordsIDs[7],
      );
      // 7 Scroll down to the "Alternative title" accordion button. "MARC authority" app icon is displayed next to each linked alternative title
      alternativeTitles.forEach((title) => {
        InventoryInstance.checkAuthorityAppIconInSection('list-alternative-titles', title, true);
      });
      // 8 Scroll down to the "Series" accordion button. "MARC authority" app icon is displayed next to each linked series
      seriesList.forEach((series) => {
        InventoryInstance.checkAuthorityAppIconInSection('list-series-statement', series, true);
      });
      // 9 Click on the "Actions" in the third pane >> Select "View source".
      InventoryInstance.viewSource();
      preLinkedFields.forEach((field) => {
        InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
      });
      linkedFields.forEach((field) => {
        InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
      });
    },
  );
});
