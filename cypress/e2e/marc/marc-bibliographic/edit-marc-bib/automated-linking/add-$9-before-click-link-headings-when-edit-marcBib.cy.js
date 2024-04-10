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
        let userData;
        const marcAuthIcon = 'Linked to MARC authority';
        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];
        const createdRecordIDs = [];
        const naturalIds = ['n2008052404C388552', 'sh96007532C388552', 'sh99014708C388552'];
        const preLinkedFields = [
          {
            tag: '655',
            value: 'AutobiographyC388552',
            rowIndex: 41,
          },
          {
            tag: '655',
            value: 'BiographiesC388552',
            rowIndex: 43,
          },
        ];

        const marcFiles = [
          {
            marc: 'marcBibFileForC388552.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388552.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 6,
            propertyName: 'authority',
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

            cy.loginAsAdmin().then(() => {
              cy.visit(TopMenu.inventoryPath).then(() => {
                InventoryInstances.searchByTitle(createdRecordIDs[0]);
                InventoryInstances.selectInstance();
                InventoryInstance.editMarcBibliographicRecord();
                linkableFields.forEach((tag) => {
                  QuickMarcEditor.setRulesForField(tag, true);
                });
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
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingFieldContent(
              32,
              '$a Normal authors $z Jamaica $v Biography. $0 sh99014708C388552 $9 acc6b9cb-c607-4a4f-8505-a0f1a4492295',
            );
            QuickMarcEditor.updateExistingFieldContent(
              33,
              '$a Normal activists $z Jamaica $v Biography. $0 sh96007532C388552 $9 test123',
            );
            QuickMarcEditor.updateExistingFieldContent(
              39,
              '$a Authors, Jamaican $y 21st century $v Biography. $0 sh850099229 $9 acc6b9cb-c607-4a4f-8505-a0f1a4492233',
            );
            QuickMarcEditor.updateExistingFieldContent(
              17,
              '$a Chin, Staceyann, $d 1972- $e author. $0 n20080524049C388552 $9 test567',
            );
            QuickMarcEditor.fillEmptyTextAreaOfField(
              41,
              'records[41].subfieldGroups.uncontrolledAlpha',
              '$9 test333',
            );
            QuickMarcEditor.fillEmptyTextAreaOfField(
              43,
              'records[43].subfieldGroups.uncontrolledNumber',
              '$2 fast $9 acc6b9cb-c607-4a4f-8505-a0f1a4492211',
            );
            QuickMarcEditor.updateExistingFieldContent(16, '$a 818/.6 $2 22 $9 test891');
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout('Field 650 has been linked to MARC authority record(s).');
            QuickMarcEditor.checkCallout(
              'Field 100 and 650 must be set manually by selecting the link icon.',
            );

            QuickMarcEditor.verifyRowLinked(32, true);
            QuickMarcEditor.verifyRowLinked(33, true);
            QuickMarcEditor.verifyRowLinked(17, false);
            QuickMarcEditor.verifyRowLinked(39, false);
            QuickMarcEditor.checkValueAbsent(17, '$9');
            QuickMarcEditor.checkValueAbsent(39, '$9');
            QuickMarcEditor.checkValueAbsent(32, '$9');
            QuickMarcEditor.checkValueAbsent(33, '$9');
            QuickMarcEditor.checkValueExist(15, '$9');
            QuickMarcEditor.checkValueExist(16, '$9');
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              `${marcAuthIcon}\n\t650\t  0\t$a Normal authors $z Jamaica $v Biography. $0 http://id.loc.gov/authorities/subjects/sh99014708C388552 $9`,
            );
            InventoryViewSource.contains(
              `${marcAuthIcon}\n\t650\t  0\t$a Normal activists $z Jamaica $v Biography. $0 http://id.loc.gov/authorities/subjects/sh96007532C388552 $9`,
            );
            InventoryViewSource.contains(
              `${marcAuthIcon}\n\t655\t  2\t$a AutobiographyC388552 $0 http://id.loc.gov/authorities/subjects/sh85010050 $9`,
            );
            InventoryViewSource.contains(
              `${marcAuthIcon}\n\t655\t  7\t$a BiographiesC388552 $0 http://id.loc.gov/authorities/genreForms/gf2014026049 $9`,
            );
            InventoryViewSource.contains('$2 fast');
          },
        );
      });
    });
  });
});
