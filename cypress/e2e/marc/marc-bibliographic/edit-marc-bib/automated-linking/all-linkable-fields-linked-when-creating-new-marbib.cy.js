import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'Test: created record with all linkable fields',
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
            tag: '240',
            content: '$a C389483 Black Panther $0 no2020024230C389483',
            value: 'C389483 Black Panther',
            type: 'Title data',
          },
          {
            rowIndex: 6,
            tag: '600',
            content:
              '$a C389483 Black Panther $c (Fictitious character) $2 fast $0 n2016004081C389483',
            value: 'C389483 Black Panther (Fictitious character)',
            type: 'Subject',
          },
          {
            rowIndex: 7,
            tag: '610',
            content: '$a C389483 Black Panther $0 nb2009024488C389483',
            value: 'C389483 Black Panther Movement',
            type: 'Subject',
          },
          {
            rowIndex: 8,
            tag: '611',
            content: '$a C389483 Panther Photographic $0 n82216757C389483',
            value: 'C389483 Panther Photographic International',
            type: 'Subject',
          },
          {
            rowIndex: 9,
            tag: '630',
            content: '$a C389483 Black Panther $0 no2023006889C389483',
            value: 'C389483 Black Panther, Wakanda forever (Motion picture)',
            type: 'Subject',
          },
          {
            rowIndex: 10,
            tag: '650',
            content: '$a C389483 Good and evil. $2 fast $0 sh2009125989C389483',
            value: 'C389483 Good and evil',
            type: 'Subject',
          },
          {
            rowIndex: 11,
            tag: '651',
            content: '$a C389483 Africa. $2 fast $0 sh85001531C389483',
            value: 'C389483 Africa',
            type: 'Subject',
          },
          {
            rowIndex: 12,
            tag: '655',
            content: '$a C389483 Comics (Graphic works) $2 fast $0 gf2014026266C389483',
            value: 'C389483 Comics (Graphic works)',
            type: 'Subject',
          },
          {
            rowIndex: 13,
            tag: '700',
            content:
              '$a C389483 Lee, Stan, $d 1922-2018, $e creator.$0 http://id.loc.gov/authorities/names/n83169267C389483',
            value: 'C389483 Lee, Stan, 1922-2018',
            type: 'Contributor',
          },
          {
            rowIndex: 14,
            tag: '710',
            content: '$a C389483 Robinson $0 no2008081921C389483',
            value: 'C389483 Robinson & Associates, Inc',
            type: 'Contributor',
          },
          {
            rowIndex: 15,
            tag: '711',
            content: '$a C389483 Delaware $0 n84745425C389483',
            value:
              'C389483 Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
            type: 'Contributor',
          },
          {
            rowIndex: 16,
            tag: '730',
            content: '$a C389483 Gone T $0 n79066095C389483',
            value: 'C389483 Neilson, Donald, 1936-2011',
            type: 'Title data',
          },
          {
            rowIndex: 17,
            tag: '800',
            content: '$a C389483 Neilson, Donald $0 n79023811C389483',
            value: 'C389483 Neilson, Donald, 1936-2011',
            type: 'Title data',
          },
          {
            rowIndex: 18,
            tag: '810',
            content: '$a C389483 Black Panther Party $0 n80095585C389483',
            value: 'C389483 Black Panther Party',
            type: 'Title data',
          },
          {
            rowIndex: 19,
            tag: '811',
            content: '$a C389483 Stockholm International Film Festival $0 no2018125587C389483',
            value: 'C389483 Stockholm International Film Festival',
            type: 'Title data',
          },
          {
            rowIndex: 20,
            tag: '830',
            content: '$a C389483 Black Panther $0 no2018018754C389483',
            value: 'C389483 Black Panther (Motion picture : 2018)',
            type: 'Title data',
          },
        ];
        const linkableFields = [
          '100',
          '240',
          '600',
          '610',
          '611',
          '630',
          '650',
          '651',
          '655',
          '700',
          '710',
          '711',
          '730',
          '800',
          '810',
          '811',
          '830',
        ];

        let userData = {};

        const marcFiles = [
          {
            marc: 'marcAuthFileForC389483.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 20,
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389483*');

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record.authority.id);
              });
            });
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          for (let i = 0; i < 20; i++) {
            MarcAuthority.deleteViaAPI(createdAuthorityIDs[i], true);
          }
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[20]);
        });

        it(
          'C422147 All linkable fields are linked after clicking on the "Link headings" button when create "MARC bib" (spitfire) (TaaS)',
          { tags: ['criticalPathFlaky', 'spitfire', 'C422147'] },
          () => {
            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            newFields.forEach((newField) => {
              MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
              cy.wait(500);
            });

            // move this step here from the precondition due to a concurrency issue in parallel runs
            cy.getAdminToken();
            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });

            // wait for fields to be filled in
            cy.wait(2000);
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            cy.wait(1000);
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
    });
  });
});
