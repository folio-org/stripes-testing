import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
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

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        let userData = {};
        const marcAuthIcon = 'Linked to MARC authority';

        const marcFiles = [
          {
            marc: 'marcBibFileForC388642.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388642.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 20,
            propertyName: 'authority',
          },
        ];

        const linkingTagAndValues = [
          {
            rowIndex: 82,
            value: 'C388642 Lee, Stan, 1922-2018',
            tag: 700,
            boxFourth: '$a C388642 Lee, Stan, $d 1922-2018',
            boxFifth: '$e creator.',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n83169267',
            boxSeventh: '',
          },
          {
            rowIndex: 84,
            value: 'C388642 Robinson & Associates, Inc.',
            tag: 710,
            boxFourth: '$a C388642 Robinson & Associates, Inc.',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/no2008081921',
            boxSeventh: '',
          },
          {
            rowIndex: 85,
            value:
              'C388642 Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
            tag: 711,
            boxFourth:
              '$a C388642 Delaware Symposium on Language Studies. $t Delaware symposia on language studies $f 1985',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n84745425',
            boxSeventh: '',
          },
          {
            rowIndex: 86,
            value: 'C388642 Gone with the wind (Motion picture : 1939)',
            tag: 730,
            boxFourth: '$a C388642 Gone with the wind $g (Motion picture : $f 1939)',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n79066095',
            boxSeventh: '',
          },
        ];

        const fields = [
          {
            rowIndex: 32,
            tag: '100',
            naturalId: 'n20080010849',
            newContent: '$a Coates, Ta-Nehisi, $eauthor. $0 n2008001084',
          },
          {
            rowIndex: 33,
            tag: '240',
            naturalId: 'no20200242309',
          },
          {
            rowIndex: 61,
            tag: '600',
            naturalId: 'n20160040819',
          },
          {
            rowIndex: 56,
            tag: '610',
            naturalId: 'nb20090244889',
          },
          {
            rowIndex: 57,
            tag: '611',
            naturalId: 'n822167579',
          },
          {
            rowIndex: 58,
            tag: '630',
            naturalId: 'no20230068899',
          },
          {
            rowIndex: 63,
            tag: '650',
            naturalId: 'sh20091259899',
          },
          {
            rowIndex: 67,
            tag: '651',
            naturalId: 'sh850015319',
          },
          {
            rowIndex: 69,
            tag: '655',
            naturalId: 'gf20140262669',
          },
          {
            rowIndex: 87,
            tag: '800',
            naturalId: 'n790238119',
          },
          {
            rowIndex: 88,
            tag: '810',
            naturalId: 'n800955859',
          },
          {
            rowIndex: 89,
            tag: '811',
            naturalId: 'no20181255879',
          },
          {
            rowIndex: 90,
            tag: '830',
            naturalId: 'no20180187549',
          },
        ];

        const createdRecordsIDs = [];

        const linkableFields = [
          100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, 830,
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388642*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordsIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              cy.waitForAuthRefresh(() => {
                cy.reload();
                InventoryInstances.waitContentLoading();
              });
              InventoryInstances.searchByTitle(createdRecordsIDs[0]);
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
              QuickMarcEditor.saveAndCloseWithValidationWarnings();
              QuickMarcEditor.checkAfterSaveAndClose();
            });
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

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
          createdRecordsIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id, true);
          });
        });

        it(
          'C388642 All linkable fields are NOT linked after clicking on the "Link headings" button when derive "MARC bib" except already linked fields (spitfire) (TaaS)',
          { tags: ['criticalPathFlaky', 'spitfire', 'C388642'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.clickKeepLinkingButton();
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
              'Field 100, 240, 600, 610, 611, 630, 650, 651, 655, 800, 810, 811, and 830 must be set manually by selecting the link icon.',
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.verifySaveAndCloseButtonDisabled();
            cy.wait(1000);
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

            QuickMarcEditor.updateExistingFieldContent(fields[0].rowIndex, fields[0].newContent);
            QuickMarcEditor.verifySaveAndCloseButtonEnabled();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAfterDerivedMarcBibSave();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.viewSource();
            linkingTagAndValues.forEach((field) => {
              InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
            });
          },
        );
      });
    });
  });
});
