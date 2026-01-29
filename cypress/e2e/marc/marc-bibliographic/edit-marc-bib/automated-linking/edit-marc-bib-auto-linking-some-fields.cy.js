import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        let userData;
        const linkableFields = [
          100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, 830,
        ];
        const instanceTitle =
          'Black Panther (Test: with all eligible for linking fields with and without valid subfield 0)';
        const fields = [
          { rowIndex: 32, tag: '100', subfield0: 'n2008001084', isLinked: true },
          { rowIndex: 33, tag: '240', subfield0: 'no2020024230', isLinked: true },
          { rowIndex: 61, tag: '600', subfield0: 'n2016004081', isLinked: true },
          { rowIndex: 58, tag: '630', subfield0: 'no2023006889', isLinked: true },
          { rowIndex: 69, tag: '655', subfield0: 'gf2014026266', isLinked: true },
          { rowIndex: 84, tag: '710', subfield0: 'no2008081921', isLinked: true },
          { rowIndex: 85, tag: '711', subfield0: 'n84745425', isLinked: true },
          { rowIndex: 87, tag: '800', subfield0: 'n79023811', isLinked: true },
          { rowIndex: 90, tag: '830', subfield0: 'no2018018754', isLinked: true },
          { rowIndex: 56, tag: '610', subfield0: 'nb20090244889', isLinked: false },
          { rowIndex: 57, tag: '611', subfield0: 'n 822167579', isLinked: false },
          { rowIndex: 63, tag: '650', subfield0: 'sh20091259899', isLinked: false },
          { rowIndex: 67, tag: '651', subfield0: 'sh 850015319', isLinked: false },
          {
            rowIndex: 82,
            tag: '700',
            subfield0: 'http://id.loc.gov/authorities/names/n831692679',
            isLinked: false,
          },
          { rowIndex: 86, tag: '730', subfield0: 'n790660959 ', isLinked: false },
          { rowIndex: 88, tag: '810', subfield0: 'n 800955859', isLinked: false },
          { rowIndex: 89, tag: '811', subfield0: 'no20181255879', isLinked: false },
        ];
        const createdRecordIDs = [];
        const naturalIds = [
          'n2008001084',
          'no2020024230',
          'n2016004081',
          'no2023006889',
          'gf2014026266',
          'no2008081921',
          'n84745425',
          'n79023811',
          'no2018018754',
          'no2006108277',
          'no2009176429',
          'n80026980',
          'nb2009024488',
          'n82216757',
          'sh2009125989',
          'sh85001531',
          'n83169267',
          'n790660959',
          'n80095585',
          'no2018125587',
        ];
        const marcFiles = [
          {
            marc: 'marcBibFileForC388501.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388501.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 20,
            propertyName: 'authority',
          },
        ];
        const field710Content = 'Robinson & Associates, Inc.';
        const numOfTitles = {
          columnIndex: 5,
          rowIndex: 0,
          value: '1',
          count: 1,
        };

        before('Create test data', () => {
          // Making sure there are no duplicate authority records in the system before auto-linking
          cy.getAdminToken().then(() => {
            Cypress.Promise.all(
              naturalIds.map((id) => {
                return MarcAuthorities.deleteMarcAuthorityByIdentifierViaAPI(id);
              }),
            );
          });

          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
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

            linkableFields.forEach((field) => QuickMarcEditor.setRulesForField(field, true));
            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(userData.userId);
            createdRecordIDs.forEach((id, index) => {
              if (index === 0) InventoryInstance.deleteInstanceViaApi(id);
              else MarcAuthority.deleteViaAPI(id, true);
            });
          });
        });

        it(
          'C388501 Some of linkable fields are linked (and some are not) after clicking on the "Link headings" button when edit "MARC bib" (spitfire) (TaaS)',
          { tags: ['criticalPath', 'spitfire', 'C388501'] },
          () => {
            // #1 Find and open detail view of "MARC Bib" record from precondition, ex. of search query:
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            // #2 Click on "Actions" button in second pane → Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // * Subfield "$0" is displayed in each of eligible for linking field: 100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, 830.
            fields.forEach((field) => {
              QuickMarcEditor.verifyZeroSubfieldInUnlinkedField(field.rowIndex, field.subfield0);
            });
            // #3 Click on the "Link headings" button.
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 100, 240, 600, 630, 655, 710, 711, 800, and 830 has been linked to MARC authority record(s).',
            );
            QuickMarcEditor.checkCallout(
              'Field 610, 611, 650, 651, 700, 730, 810, and 811 must be set manually by selecting the link icon.',
            );
            fields.forEach((field) => {
              if (field.isLinked) {
                QuickMarcEditor.verifyRowLinked(field.rowIndex, true);
              } else {
                QuickMarcEditor.verifyRowLinked(field.rowIndex, false);
              }
            });
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // #4 Click on the "Link headings" button again
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 610, 611, 650, 651, 700, 730, 810, and 811 must be set manually by selecting the link icon.',
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // #5 Click on the "Save & keep editing" button.
            QuickMarcEditor.clickSaveAndKeepEditing();
            // #6 Go to "MARC authority" app.
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            // #7 * Fill in the search box with contributor name value which was auto-linked (ex. from "710" field).
            // * Click on the "Search" button.
            MarcAuthorities.searchBy('Keyword', field710Content);
            // * "MARC authority" record with which field from "MARC Bib" record was auto-linked is displayed in the search result pane.
            MarcAuthorities.checkResultList([field710Content]);
            // * Digit value is displayed in the "Number of titles" column in the same row as "MARC authority" record found.
            MarcAuthorities.verifyNumberOfTitles(numOfTitles.columnIndex, numOfTitles.value);
            // #8 Click on the digit value from "Number of titles" column in the same row as "MARC authority" record found.
            MarcAuthorities.clickOnNumberOfTitlesLink(numOfTitles.columnIndex, numOfTitles.value);
            // * User is redirected to the "Inventory" search result pane with "Instance" records having linked fields with the same "MARC authority" record.
            // * Edited "MARC Bibliographic" record with auto-linked fields is displayed in the search result list.
            InventorySearchAndFilter.verifySearchResult(instanceTitle);
            // * Number of displayed records in the search result list is the same as the clicked value from the "Number of titles" column.
            InventorySearchAndFilter.verifyNumberOfSearchResults(numOfTitles.count);
          },
        );
      });
    });
  });
});
